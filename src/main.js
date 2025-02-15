const { Builder, By, until } = require("selenium-webdriver");
const firefox = require("selenium-webdriver/firefox");
const fs = require("fs");
const path = require("path");
const axios = require("axios");

// Carregar configurações
const config = require("../config.json");

class LinkedinPostExtractor {
  constructor(userProfilePath) {
    this.userProfilePath = userProfilePath;
    this.driver = null;
    this.comentariosPath = path.resolve(__dirname, "comentarios.json");
    this.comentariosFeitos = this._carregarComentariosFeitos();
  }

  async initialize() {
    const options = new firefox.Options();
    options.setProfile(this.userProfilePath);
    this.driver = await new Builder()
      .forBrowser("firefox")
      .setFirefoxOptions(options)
      .build();
  }

  async extractPostsFromLinkedin() {
    try {
      // Navega para o LinkedIn
      await this.driver.get("https://www.linkedin.com/feed/");

      // Espera a página carregar (máximo 10 segundos)
      await this.driver.wait(until.elementLocated(By.css("[data-id]")), 10000);

      // Rola a página algumas vezes para carregar mais posts
      await this._scrollPage();

      // Encontra e processa os posts
      const posts = await this._findAllPosts();
      const extractedPosts = await this._processPosts(posts);
      await this._savePostsToFile(extractedPosts);
      console.log(`\nTotal de posts encontrados: ${posts.length}`);
    } catch (error) {
      console.error("Erro durante a extração:", error);
    } finally {
      await this._cleanup();
    }
  }
  async _scrollPage() {
    const scrollAttempts = 1;
    for (let i = 0; i < scrollAttempts; i++) {
      await this.driver.executeScript(
        "window.scrollTo(0, document.body.scrollHeight)"
      );
      await this.driver.sleep(2000); // Espera 2 segundos para carregar novos posts
    }
  }

  async _loadPage(htmlPath) {
    const fileUrl = `file://${htmlPath}`;
    await this.driver.get(fileUrl);
  }

  async _findAllPosts() {
    return await this.driver.findElements(By.css("[data-id]"));
  }

  async comentarPost(post, texto) {
    try {
      // Encontra e clica no botão de comentário
      const botaoComentar = await post.findElement(
        By.css('button[aria-label="Comentar"]')
      );
      await botaoComentar.click();

      // Espera a caixa de comentário aparecer
      await this.driver.sleep(1000);

      // Encontra o editor de texto e insere o comentário
      const editorComentario = await post.findElement(
        By.css('.ql-editor[contenteditable="true"]')
      );
      await editorComentario.click();
      await editorComentario.sendKeys(texto);

      // Espera um momento para o botão de enviar ficar ativo
      await this.driver.sleep(500);

      // Encontra e clica no botão de enviar comentário
      const botaoEnviar = await post.findElement(
        By.css(".comments-comment-box__submit-button--cr")
      );
      await botaoEnviar.click();

      // Espera o comentário ser postado
      await this.driver.sleep(1000);

      console.log("Comentário postado com sucesso!");
    } catch (error) {
      console.error("Erro ao comentar no post:", error);
    }
  }
  _carregarComentariosFeitos() {
    try {
      if (fs.existsSync(this.comentariosPath)) {
        return JSON.parse(fs.readFileSync(this.comentariosPath, "utf8"));
      }
      return {};
    } catch (error) {
      console.error("Erro ao carregar comentários:", error);
      return {};
    }
  }

  async _salvarComentario(postId, comentario) {
    try {
      this.comentariosFeitos[postId] = {
        comentario,
        data: new Date().toISOString(),
      };
      fs.writeFileSync(
        this.comentariosPath,
        JSON.stringify(this.comentariosFeitos, null, 2)
      );
    } catch (error) {
      console.error("Erro ao salvar comentário:", error);
    }
  }

  async _jaComentou(postId) {
    return postId in this.comentariosFeitos;
  }
  async _gerarComentarioIA(postData) {
    try {
      const prompt = `
      Crie um comentário profissional em português brasileiro:
      Com base neste post do LinkedIn, gere um comentário profissional e engajador:
      Autor: ${postData.nomeAutor}
      Cargo: ${postData.titleAutor}
      Post: ${postData.descriptionPost}
      
      Regras obrigatórias:
      - Quero apenas um commentario
      - APENAS português brasileiro
      - Máximo 2-3 linhas
      - Seja profissional e construtivo
      - Relacione com a área do autor
      - Use 1 emoji no máximo
      - Sem palavras em inglês
    `;

      const response = await axios.post("http://localhost:11434/api/generate", {
        model: "mistral",
        prompt: prompt,
        stream: false,
      });

      // Remove aspas duplas e espaços extras
      let comentario = response.data.response.trim();
      comentario = comentario.replace(/^["']|["']$/g, "").trim();

      console.log("Resposta da IA:", response.data.response.trim());
      return response.data.response.trim();
    } catch (error) {
      console.error("Erro ao gerar comentário com IA:", error);
      return "Muito interessante! 👏";
    }
  }
  async _processPosts(posts) {
    const extractedPosts = [];
    for (const post of posts) {
      try {
        const postData = await this._extractPostData(post);
        if (postData) {
          extractedPosts.push(postData);

          // Verifica se é post normal e se ainda não foi comentado
          if (
            postData.tipoPost === "Post normal" &&
            !(await this._jaComentou(postData.dataId))
          ) {
            console.log("Post normal encontrado, gerando comentário...");
            console.log(`Gerando comentario para ${postData.nomeAutor}`);
            // Gera comentário personalizado com IA
            const comentario = await this._gerarComentarioIA(postData);
            console.log("Comentário gerado");

            // Comenta e salva
            await this.comentarPost(post, comentario);
            await this._salvarComentario(postData.dataId, comentario);
            await this.driver.sleep(2000);
          } else if (await this._jaComentou(postData.dataId)) {
            console.log(
              `Post ${postData.dataId} já foi comentado anteriormente.`
            );
          }
        }
      } catch (error) {
        console.error("Erro ao processar post:", error);
      }
    }
    return extractedPosts;
  }

  async _extractPostData(post) {
    const dataId = await post.getAttribute("data-id");
    const numeroPublicacao = await this._getPublicationNumber(post);
    if (!numeroPublicacao) return null;

    const postType = await this._determinePostType(post);
    const nomeAutor = await this._getAuthorName(post, postType);
    const titleAutor = await this._getAuthorTitle(post, postType.isPromoted);
    const descriptionPost = await this._getPostDescription(post);

    return {
      dataId,
      numeroPublicacao,
      nomeAutor,
      titleAutor,
      descriptionPost,
      tipoPost: postType.type,
    };
  }

  async _getPublicationNumber(post) {
    try {
      return await post.findElement(By.css("h2.visually-hidden")).getText();
    } catch {
      return null;
    }
  }

  async _determinePostType(post) {
    const postType = {
      isJobUpdate: false,
      isPromoted: false,
      isShared: false,
      isLiked: false,
      isGroup: false,
      type: "Post normal",
    };

    await this._checkGroupPost(post, postType);
    await this._checkInteractionType(post, postType);
    await this._checkPromotedPost(post, postType);
    await this._checkJobUpdate(post, postType);

    return postType;
  }

  async _checkGroupPost(post, postType) {
    try {
      const groupLink = await post.findElement(By.css('a[href*="/groups/"]'));
      if (groupLink) {
        postType.isGroup = true;
        postType.type = "Post de Grupo";
      }
    } catch {}
  }

  async _checkInteractionType(post, postType) {
    try {
      const headerText = await post
        .findElement(By.css(".update-components-header__text-view"))
        .getText();

      if (headerText.includes("compartilhou isso")) {
        postType.isShared = true;
        postType.type = "Post Compartilhado";
      } else if (headerText.includes("gostou disso")) {
        postType.isLiked = true;
        postType.type = "Post Gostado";
      }
    } catch {}
  }

  async _checkPromotedPost(post, postType) {
    try {
      const promotedText = await this._findPromotedText(post);
      if (promotedText) {
        postType.isPromoted = true;
        postType.type = "Post Promovido";
      }
    } catch {}
  }

  async _checkJobUpdate(post, postType) {
    try {
      const headerText = await post
        .findElement(By.css(".update-components-header__text-view"))
        .getText();

      if (headerText.includes("Atualização de emprego")) {
        postType.isJobUpdate = true;
        postType.type = "Atualização de emprego";
      }
    } catch {}
  }

  async _getAuthorName(post, postType) {
    try {
      if (postType.isJobUpdate) {
        return await post
          .findElement(By.css(".update-components-header__text-view strong"))
          .getText();
      }
      return await post
        .findElement(By.css('span[dir="ltr"] span[aria-hidden="true"]'))
        .getText();
    } catch {
      return "";
    }
  }

  async _getAuthorTitle(post, isPromoted) {
    if (isPromoted) return "";
    try {
      return await post
        .findElement(By.css(".update-components-actor__description"))
        .getText();
    } catch {
      return "";
    }
  }

  async _getPostDescription(post) {
    try {
      return await post
        .findElement(
          By.css("span.break-words.tvm-parent-container span[dir='ltr']")
        )
        .getText();
    } catch {
      return "";
    }
  }

  async _savePostsToFile(posts) {
    const jsonFilePath = path.resolve(__dirname, "posts_normais.json");
    try {
      let existingPosts = [];
      if (fs.existsSync(jsonFilePath)) {
        existingPosts = JSON.parse(fs.readFileSync(jsonFilePath, "utf8"));
      }
      const updatedPosts = [...existingPosts, ...posts];
      fs.writeFileSync(jsonFilePath, JSON.stringify(updatedPosts, null, 2));
      console.log("Posts salvos com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar posts:", error);
    }
  }

  async _cleanup() {
    if (this.driver) {
      await this.driver.sleep(10000000);
      await this.driver.quit();
    }
  }
}

// Arquivo de execução principal
async function main() {
  const userProfilePath = path.join(
    "C:",
    "Users",
    config.userProfilePath.username,
    "AppData",
    "Roaming",
    "Mozilla",
    "Firefox",
    "Profiles",
    config.userProfilePath.profile
  );

  const extractor = new LinkedinPostExtractor(userProfilePath);
  await extractor.initialize();
  await extractor.extractPostsFromLinkedin();
}

main().catch(console.error);
