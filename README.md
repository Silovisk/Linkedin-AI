<h1 align="center">Linkedin AI Post Extractor</h1>

<p align="center">
  <a href="#funcionalidades">Funcionalidades</a> •
  <a href="#tecnologias-utilizadas">Tecnologias Utilizadas</a> •
  <a href="#como-executar">Como Executar</a> •
  <a href="#contribuidores">Contribuidores</a> •
  <a href="#licenca">Licença</a>
</p>

## Descrição do Projeto

Este projeto é um extrator de posts do LinkedIn utilizando Selenium WebDriver e Firefox. Ele navega pelo feed do LinkedIn, extrai informações dos posts e gera comentários automáticos utilizando uma API de IA.

## Status do Projeto

<h4 align="center"> 
    🚧  Projeto em construção  🚧
</h4>
<p align="center">
    O projeto está funcional, mas faltam algumas adaptações. Novas features vêm por aí! Fique atento para futuras atualizações.
</p>

## Funcionalidades

- Extrair posts do LinkedIn
- Gerar comentários automáticos utilizando IA
- Salvar posts e comentários em arquivos JSON

## Demonstração da Aplicação

![Demonstração](https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif)

## Tecnologias Utilizadas

- Node.js
- Selenium WebDriver
- Firefox
- Axios

## Como Executar

## Configuração do Ollama e Mistral

1. Instale o Ollama:
   https://ollama.com/download
2. Instale o Mistral:
   ```bash
   ollama pull mistral
   ```

##

1. Clone o repositório:
   ```bash
   git clone https://github.com/Silovisk/Linkedin-AI.git
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure o caminho do perfil do Firefox no arquivo `src/config.example.json`.

    ```json
    {
      "userProfilePath": {
         "username": "SEU_USUARIO",
         "profile": "SEU_PERFIL_FIREFOX"
      }
    }
    ```

    **Obs:** Nesse passo você precisa criar um novo perfil no Firefox e fazer login no LinkedIn. Para criar um novo perfil:

    - Abra o Firefox e digite `about:profiles` na barra de endereços.
    - Clique em "Criar um Novo Perfil".
    - Siga as instruções do assistente de criação.
    - Depois de criar o perfil, selecione "Iniciar o Firefox com este perfil".
    - Faça login no LinkedIn.
    - Copie o nome do perfil criado e coloque no arquivo de configuração no campo `profile`.
    - O nome de usuário do Windows deve ser colocado no campo `SEU_USUARIO`.

    - Para iniciar o script o perfil dedicado precisa estar fechado
4. Renomeie o arquivo `config.example.json` para `config.json`:

   ```bash
   mv config.example.json config.json
   ```

5. Execute o projeto:
   ```bash
   node src/main.js
   ```

## Contribuidores

Estamos abertos a contribuições! Sinta-se à vontade para colaborar com este projeto.

## Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para mais detalhes.
