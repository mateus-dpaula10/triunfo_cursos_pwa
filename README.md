# triunfo_cursos_pwa

PWA da Triunfo Cursos (área do aluno e gestão). Consome a API do sistema Laravel
(`triunfo-cursos`, rotas em `routes/api.php`): login por CPF devolve um token
Sanctum, enviado como `Authorization: Bearer <token>`.

Next.js 16 com export estático, Tailwind 4, shadcn/ui (Base UI) e React Query.

## Rodar local

Precisa da API Laravel rodando na porta 8000:

```bash
# no projeto triunfo-cursos
php artisan serve --host=127.0.0.1 --port=8000
```

E o app:

```bash
npm install
npm run dev
```

Abrir http://localhost:3000. A URL da API em dev fica em `.env.development.local`
(não versionado):

```
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000/api
```

## Publicar

```bash
npm run build
```

Gera o site estático em `out/`, já apontando para a API de produção
(`.env.production`). Basta subir o conteúdo de `out/` num domínio com HTTPS
(necessário para instalar o app e para o service worker).

## Telas

| Rota | Quem vê |
|---|---|
| `/login/` | todos |
| `/cursos/` | aluno: apostila e prova do curso · admin: gestão de cursos |
| `/prova/?id=` | aluno: prova com cronômetro (respostas salvas no aparelho) |
| `/resultado/?id=` | aluno |
| `/provas/`, `/provas/nova/` | admin |
| `/usuarios/`, `/usuarios/novo/` | admin |
| `/conta/` | todos: dados, troca de senha, instalar app |
