# Melhorias da descoberta e do chat

## Resultado
- A foto da modelo ocupará toda a tela inicial, sem margens brancas, mantendo nome, status e ação de conversar legíveis sobre a imagem.
- O chat terá aparência próxima ao WhatsApp, com cabeçalho compacto, mensagens mais limpas e uma foto de fundo configurável por modelo.
- As respostas serão mais rápidas e coerentes, com instruções mais objetivas, histórico incluindo a nova mensagem e falhas mostradas claramente em vez de respostas aleatórias.

## Implementação
1. Adicionar ao cadastro da modelo um campo de foto de fundo do chat, com escolha, prévia, troca e remoção.
2. Salvar essa foto junto ao perfil no Lovable Cloud e carregar o valor em qualquer aparelho.
3. Refazer a tela de descoberta como uma experiência de foto em tela cheia, com gestos preservados e controles sobrepostos.
4. Compor a conversa usando os elementos de chat recomendados, mantendo pagamento e chamada já existentes.
5. Aplicar o fundo configurado com uma camada de leitura para as mensagens continuarem claras.
6. Ajustar o envio à IA para incluir a mensagem atual, encurtar a resposta e usar raciocínio leve sem exibir demora desnecessária.
7. Atualizar os títulos e descrições sociais das páginas alteradas e verificar em celular e computador.

## Detalhes técnicos
- Nova coluna opcional `foto_fundo_chat` na tabela de modelos, com as permissões atuais preservadas.
- A foto será compactada antes do envio para reduzir peso.
- O histórico continuará separado por modelo no navegador, como já funciona hoje.
- O modelo de IA atual será preservado; a otimização será feita no contexto e nas instruções, não trocando o modelo.
