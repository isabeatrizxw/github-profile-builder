# Checklist de teste do fluxo completo

Use em desenvolvimento (`http://localhost:3000`) e de novo em produção (domínio da Vercel).
Marque cada item. Se algo falhar, anote a mensagem exibida e o passo.

## 1. Entrada

- [ ] A tela inicial abre em português ou inglês conforme o navegador; PT/EN troca o idioma e a escolha é mantida ao recarregar.
- [ ] "Entrar com GitHub" leva ao GitHub e, depois de autorizar, volta para `/drafts`.
- [ ] Cancelar a autorização no GitHub volta para a tela inicial com aviso de cancelamento.
- [ ] Acessar `/drafts` sem estar logada volta para a tela inicial.

## 2. Perfil atual

- [ ] O resumo do perfil em `/drafts` mostra nome, bio, campos, redes sociais, status do README de perfil, quantidade de repositórios públicos e fixados.
- [ ] Os dados batem com o seu perfil no GitHub.

## 3. Rascunhos

- [ ] "Novo rascunho" com nome e sem nome (vira "Rascunho de <data>"). O rascunho começa com os dados atuais do GitHub.
- [ ] A lista mostra os rascunhos com data de atualização.
- [ ] Duplicar cria "<nome> (cópia)".
- [ ] Excluir pede confirmação e remove da lista.
- [ ] Selecionar vários rascunhos (ou "Selecionar todos") e usar "Duplicar selecionados" e "Excluir selecionados" (pede confirmação com a quantidade).
- [ ] Abrir um endereço de rascunho inexistente mostra a página "não encontrada".

## 4. Editor

- [ ] Aba Perfil: editar campos atualiza a prévia do perfil ao digitar.
- [ ] Bio com mais de 160 caracteres ou rede social sem `https://` mostra erro no campo sem perder o texto.
- [ ] Campos com limite mostram o contador (ex.: "42/160" na bio), inclusive o nome do novo rascunho.
- [ ] E-mail público: a lista mostra só e-mails verificados.
- [ ] "Alterações não salvas" aparece ao editar; sair pelo "Voltar", pelo nome do produto no header ou por "Sair" pede confirmação.
- [ ] Salvar mostra "Rascunho salvo. Nada foi alterado no GitHub." e recarregar a página mantém os dados.
- [ ] Celular (ou janela estreita): formulário em cima, prévia embaixo.

## 5. README

- [ ] Aba README: trocar template (Clássico, Minimalista, Compacto) e idioma muda a prévia.
- [ ] Ligar/desligar seções e editar textos (com **Markdown**) aparece na prévia.
- [ ] Trocar os títulos (ex.: "Sobre mim", "🖥️ Linguagens") muda as prévias Visual e Markdown; apagar o título volta ao padrão.
- [ ] Tecnologias aparecem por categoria com ícones; no tema escuro do sistema, ícones como GitHub e Next.js ficam claros.
- [ ] Projetos selecionados aparecem com descrição real do GitHub.
- [ ] Alternar Visual / Markdown e "Copiar Markdown" funcionam.

## 6. Revisão e aplicação no GitHub (cuidado: altera seu perfil real)

Antes: anote como estão seu perfil e seu README.

- [ ] Com alterações não salvas, "Revisar e aplicar" fica bloqueado com a explicação "salve antes".
- [ ] A revisão mostra, por parte, o valor atual e o novo; partes sem mudança aparecem como "nada a alterar".
- [ ] Primeiro teste: mude só um campo reversível (ex.: localização), desmarque o README e aplique. A confirmação "Aplicar alterações no GitHub?" aparece.
- [ ] O resultado mostra cada passo como aplicado; o perfil no GitHub mudou. Volte o valor original pelo app.
- [ ] Redes sociais: adicionar e remover uma, conferir no GitHub.
- [ ] README: com repositório `login/login` existente, a aba "README atual" mostra o conteúdo de hoje; aplicar substitui e o histórico do repositório guarda a versão antiga.
- [ ] Se não houver repositório `login/login`, a revisão e a confirmação avisam que ele será criado público.
- [ ] Editar o perfil no GitHub com a revisão aberta e então aplicar: deve aparecer "mudou desde a revisão" com o botão Recarregar, sem aplicar nada.

## 7. Sessão

- [ ] "Sair" encerra a sessão e volta para a tela inicial.
- [ ] Revogar o app em GitHub → Settings → Applications → Authorized OAuth Apps e recarregar `/drafts`: volta para a tela inicial com aviso de sessão expirada.

## 8. Produção (Vercel)

- [ ] Todos os itens acima no domínio de produção, com o OAuth App de produção.
- [ ] Rascunhos de produção não aparecem no ambiente local (bancos separados).
