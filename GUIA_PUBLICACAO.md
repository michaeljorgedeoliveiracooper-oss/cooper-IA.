# Cooper IA — Etapa 4: preparação para publicação

Esta etapa prepara o projeto para hospedagem no Render. **Ela não publica o site automaticamente**: é necessário criar/entrar numa conta de hospedagem, conectar o repositório e configurar a chave de IA.

## O que foi preparado
- `render.yaml`: configuração inicial do serviço web.
- Disco persistente para o SQLite (`data/`), para evitar perder contas e histórico em reinicializações.
- `SESSION_SECRET` gerado pelo provedor.
- `OPENAI_API_KEY` como variável secreta, nunca exposta ao navegador.
- Verificação de saúde em `/api/status`.
- `trust proxy` ativado em produção para cookies seguros atrás do proxy HTTPS.
- `Dockerfile` alternativo para hospedagens compatíveis.

## Como publicar usando Render
1. Crie uma conta no Render e um repositório Git privado no GitHub.
2. Envie todo o conteúdo desta pasta para a raiz do repositório.
3. No Render, escolha **New + → Blueprint** e conecte o repositório.
4. Revise a configuração `render.yaml` e crie o serviço. O plano Starter e o disco persistente podem gerar custos; confira os preços antes de confirmar.
5. No painel do serviço, adicione `OPENAI_API_KEY` com sua chave privada. Nunca coloque essa chave em `public/`, no GitHub ou em mensagens.
6. Aguarde o deploy e abra o endereço `.onrender.com` gerado.
7. Teste cadastro, saída, login e geração de conteúdo. Se a IA não estiver configurada, a aplicação deve avisar que falta a chave.

## Antes de receber clientes reais
- Configure domínio próprio e HTTPS pelo provedor.
- Faça backup do disco SQLite e teste a restauração.
- Adicione verificação de e-mail e recuperação de senha.
- Publique política de privacidade e termos, observando a LGPD.
- Implemente limites de uso por plano, cobrança Pix/cartão e gestão de assinaturas.
- Revise segurança, logs, custos e proteção contra abuso.

## Atenção sobre custos
A hospedagem, o armazenamento persistente e as chamadas à API podem ter cobrança separada. O arquivo de configuração é um ponto de partida, não uma garantia de preço ou disponibilidade. Verifique os valores atuais no provedor antes de contratar.

## Teste local
Requer Node.js 20 ou superior:
1. `npm install`
2. Copie `.env.example` para `.env`.
3. Defina `SESSION_SECRET` e, se desejar IA ativa, `OPENAI_API_KEY`.
4. `npm start`
5. Abra `http://localhost:3000`.
