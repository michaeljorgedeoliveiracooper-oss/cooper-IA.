# Cooper IA — Etapa 3

Esta versão conecta a interface web ao servidor, cadastro/login e armazenamento local das criações.

## Requisitos
- Node.js 20 ou superior
- npm
- Uma chave de API da OpenAI para ativar as gerações reais (opcional durante a instalação)

## Executar no computador
1. Extraia o ZIP.
2. Abra um terminal dentro da pasta `Cooper_IA_Etapa_3`.
3. Execute `npm install`.
4. Copie `.env.example` para `.env`.
5. Edite `.env` e defina uma `SESSION_SECRET` longa e aleatória.
6. Para habilitar IA, informe sua `OPENAI_API_KEY` no `.env`.
7. Execute `npm start`.
8. Abra `http://localhost:3000`.

## O que já está implementado
- Interface responsiva para celular e computador.
- Cadastro e login com senha armazenada como hash bcrypt.
- Sessões persistidas em SQLite.
- Banco SQLite para contas e histórico de criações.
- Rotas protegidas para histórico e geração.
- Três ferramentas: anúncio, texto de venda e roteiro de vídeo.
- Limitação de requisições nas rotas de autenticação e IA.

## O que ainda não está pronto
- A plataforma ainda não está publicada na internet.
- A chave de IA não está incluída; você deve configurar sua própria chave no servidor.
- Não há cobrança, assinatura, Pix ou cartão integrados.
- Não há recuperação de senha, verificação de e-mail ou painel administrativo.
- Antes de produção, configure HTTPS, segredo forte, política de privacidade, termos de uso, backups e monitoramento.

## Segurança importante
Nunca coloque a chave da OpenAI no código do navegador ou compartilhe o arquivo `.env`. Em produção, defina `NODE_ENV=production`, `SESSION_SECRET` forte e use HTTPS.
