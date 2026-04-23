import { supabase } from './supabaseClient.js'

// ============================================
// VARIÁVEIS GLOBAIS
// ============================================
let lista, input, inputPreco, inputQuantidade, searchInput
let contadorTotal, contadorPendentes, contadorTotalPreco
let adicionarBtn, logoutBtn, emptyState, noResults
let sugestoesContainer, sugestoesList, clearSearchBtn

let itens = []
let itemSugestoes = []

// ============================================
// INICIALIZAÇÃO
// ============================================
async function getUser() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) window.location.href = 'login.html'
  return user
}

function initDOMElements() {
  lista = document.getElementById('lista')
  input = document.getElementById('item')
  inputPreco = document.getElementById('preco')
  inputQuantidade = document.getElementById('quantidade')
  searchInput = document.getElementById('search-input')
  contadorTotal = document.getElementById('total-itens')
  contadorPendentes = document.getElementById('pendentes-count')
  contadorTotalPreco = document.getElementById('total-preco')
  adicionarBtn = document.getElementById('adicionar-btn')
  logoutBtn = document.getElementById('logout-btn')
  emptyState = document.getElementById('empty-state')
  noResults = document.getElementById('no-results')
  sugestoesContainer = document.getElementById('sugestoes-container')
  sugestoesList = document.getElementById('sugestoes-list')
  clearSearchBtn = document.getElementById('clear-search')
}

// ============================================
// CARREGAR DADOS
// ============================================
async function carregarLista() {
  const { data, error } = await supabase
    .from('lista_compras')
    .select('*')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Erro ao carregar lista:', error)
    return
  }

  itens = data || []
  await carregarSugestoes()
  renderizarLista()
}

async function carregarSugestoes() {
  const { data, error } = await supabase
    .from('lista_compras')
    .select('item, preco')
    .order('created_at', { ascending: false })
    .limit(30)

  if (!error && data) {
    // Cria array de objetos com nome e preço para sugestões mais ricas
    const sugestoesMap = new Map()
    data.forEach(i => {
      if (!sugestoesMap.has(i.item.toLowerCase())) {
        sugestoesMap.set(i.item.toLowerCase(), {
          nome: i.item,
          preco: i.preco || 0
        })
      }
    })
    itemSugestoes = Array.from(sugestoesMap.values()).slice(0, 10)
  }
}

// ============================================
// RENDERIZAÇÃO
// ============================================
function renderizarLista(termoBusca = '') {
  if (!lista) return

  lista.innerHTML = ''

  // Filtra itens pela busca (nome, preço, autor)
  let itensFiltrados = itens
  if (termoBusca.trim()) {
    const termo = termoBusca.toLowerCase()
    itensFiltrados = itens.filter(item =>
      item.item.toLowerCase().includes(termo) ||
      (item.preco && item.preco.toString().includes(termo)) ||
      (item.adicionado_por && item.adicionado_por.toLowerCase().includes(termo))
    )
  }

  const pendentes = itensFiltrados.filter(i => !i.comprado)
  const comprados = itensFiltrados.filter(i => i.comprado)

  // Exibe/oculta estados vazios
  if (itensFiltrados.length === 0) {
    lista.style.display = 'none'
    if (termoBusca.trim()) {
      noResults.style.display = 'block'
      emptyState.style.display = 'none'
    } else {
      noResults.style.display = 'none'
      emptyState.style.display = 'block'
    }
  } else {
    lista.style.display = 'block'
    noResults.style.display = 'none'
    emptyState.style.display = 'none'
  }

  // Renderiza pendentes primeiro
  pendentes.forEach(item => renderizarItem(item, false))
  
  // Depois comprados
  if (comprados.length > 0 && pendentes.length > 0) {
    const separador = document.createElement('li')
    separador.className = 'separador'
    separador.innerHTML = `✓ Comprados (${comprados.length})`
    lista.appendChild(separador)
  }
  
  comprados.forEach(item => renderizarItem(item, true))

  atualizarEstatisticas()
  atualizarSugestoesVisiveis()
}

function renderizarItem(item, comprado) {
  const li = document.createElement('li')
  li.className = `item-lista ${comprado ? 'comprado' : ''}`
  li.setAttribute('data-id', item.id)

  const nomeUsuario = item.adicionado_por 
    ? item.adicionado_por.substring(0, 8) + '...' 
    : 'Anônimo'
  
  const quantidade = item.quantidade || 1
  const precoUnitario = item.preco || 0
  const precoTotal = quantidade * precoUnitario

  li.innerHTML = `
    <input type="checkbox" class="item-checkbox" ${comprado ? 'checked' : ''}>
    <div class="item-content">
      <div class="item-header">
        <span class="item-texto">${escapeHtml(item.item)}</span>
        ${quantidade > 1 ? `<span class="item-quantidade">x${quantidade}</span>` : ''}
      </div>
      <div class="item-detalhes">
        <span class="item-autor" title="${item.adicionado_por || 'Desconhecido'}">
          👤 ${nomeUsuario}
        </span>
        ${precoUnitario > 0 ? `
          <span class="item-preco">
            ${quantidade > 1 ? `R$ ${formatarPreco(precoUnitario)} un. · ` : ''}
            <strong>R$ ${formatarPreco(precoTotal)}</strong>
          </span>
        ` : ''}
      </div>
    </div>
    <div class="item-actions">
      <button class="btn-editar" aria-label="Editar item" data-id="${item.id}">✏️</button>
      <button class="btn-remover" aria-label="Remover item">🗑️</button>
    </div>
  `

  // Eventos
  const checkbox = li.querySelector('.item-checkbox')
  checkbox.addEventListener('change', async () => {
    await toggleItem(item.id, checkbox.checked)
    li.classList.toggle('comprado', checkbox.checked)
    renderizarLista(searchInput.value)
  })

  const btnRemover = li.querySelector('.btn-remover')
  btnRemover.addEventListener('click', () => removerItem(item.id))

  const btnEditar = li.querySelector('.btn-editar')
  btnEditar.addEventListener('click', () => editarItem(item))

  lista.appendChild(li)
}

function atualizarEstatisticas() {
  const total = itens.length
  const pendentes = itens.filter(i => !i.comprado).length
  
  // Calcula preço total dos itens pendentes
  const precoTotal = itens
    .filter(i => !i.comprado)
    .reduce((soma, item) => {
      const qtd = item.quantidade || 1
      const preco = item.preco || 0
      return soma + (qtd * preco)
    }, 0)

  if (contadorTotal) contadorTotal.textContent = total
  if (contadorPendentes) contadorPendentes.textContent = pendentes
  if (contadorTotalPreco) {
    contadorTotalPreco.textContent = `R$ ${formatarPreco(precoTotal)}`
  }
}

// ============================================
// SUGESTÕES AUTOMÁTICAS
// ============================================
function atualizarSugestoesVisiveis() {
  if (!sugestoesContainer || !sugestoesList) return

  const termo = input.value.trim().toLowerCase()

  if (!termo || itemSugestoes.length === 0) {
    sugestoesContainer.style.display = 'none'
    return
  }

  const sugestoesFiltradas = itemSugestoes.filter(s =>
    s.nome.toLowerCase().includes(termo) &&
    s.nome.toLowerCase() !== termo
  )

  if (sugestoesFiltradas.length === 0) {
    sugestoesContainer.style.display = 'none'
    return
  }

  sugestoesList.innerHTML = ''
  sugestoesFiltradas.slice(0, 5).forEach(sugestao => {
    const span = document.createElement('span')
    span.className = 'sugestao-tag'
    span.innerHTML = `${sugestao.nome} ${sugestao.preco > 0 ? `<small>R$ ${formatarPreco(sugestao.preco)}</small>` : ''}`
    span.addEventListener('click', () => {
      input.value = sugestao.nome
      if (sugestao.preco > 0) {
        inputPreco.value = sugestao.preco
      }
      sugestoesContainer.style.display = 'none'
      input.focus()
    })
    sugestoesList.appendChild(span)
  })

  sugestoesContainer.style.display = 'block'
}

// ============================================
// AÇÕES
// ============================================
async function adicionarItem() {
  if (!input) return

  const nomeItem = input.value.trim()
  if (!nomeItem) {
    input.focus()
    return
  }

  const user = await getUser()
  const preco = parseFloat(inputPreco.value) || 0
  const quantidade = parseInt(inputQuantidade.value) || 1

  // Limpa inputs
  input.value = ''
  inputPreco.value = '1'
  inputQuantidade.value = ''
  input.focus()
  sugestoesContainer.style.display = 'none'

  const { data, error } = await supabase
    .from('lista_compras')
    .insert({
      item: nomeItem,
      adicionado_por: user.id,
      comprado: false,
      preco: preco,
      quantidade: quantidade
    })
    .select()

  if (error) {
    alert('Erro ao adicionar: ' + error.message)
    input.value = nomeItem
    input.focus()
    return
  }

  if (data && data[0]) {
    itens.push(data[0])
    
    // Atualiza sugestões
    const sugestaoExistente = itemSugestoes.find(s => s.nome.toLowerCase() === nomeItem.toLowerCase())
    if (!sugestaoExistente) {
      itemSugestoes.unshift({ nome: nomeItem, preco: preco })
      if (itemSugestoes.length > 10) itemSugestoes.pop()
    }
  }

  renderizarLista(searchInput.value)
}

async function toggleItem(id, comprado) {
  const { error } = await supabase
    .from('lista_compras')
    .update({ comprado })
    .eq('id', id)

  if (error) {
    alert('Erro ao atualizar: ' + error.message)
    carregarLista()
    return
  }

  const item = itens.find(i => i.id === id)
  if (item) item.comprado = comprado
}

async function editarItem(item) {
  const novoNome = prompt('Editar nome do item:', item.item)
  if (novoNome === null) return // Cancelou
  
  const novoPreco = prompt('Editar preço (R$):', item.preco || 0)
  if (novoPreco === null) return
  
  const novaQuantidade = prompt('Editar quantidade:', item.quantidade || 1)
  if (novaQuantidade === null) return

  const { error } = await supabase
    .from('lista_compras')
    .update({
      item: novoNome.trim() || item.item,
      preco: parseFloat(novoPreco) || 0,
      quantidade: parseInt(novaQuantidade) || 1
    })
    .eq('id', item.id)

  if (error) {
    alert('Erro ao editar: ' + error.message)
    return
  }

  // Atualiza local
  const itemLocal = itens.find(i => i.id === item.id)
  if (itemLocal) {
    itemLocal.item = novoNome.trim() || item.item
    itemLocal.preco = parseFloat(novoPreco) || 0
    itemLocal.quantidade = parseInt(novaQuantidade) || 1
  }

  renderizarLista(searchInput.value)
}

async function removerItem(id) {
  if (!confirm('Tem certeza que deseja remover este item?')) return

  const itemRemovido = itens.find(i => i.id === id)
  itens = itens.filter(i => i.id !== id)
  renderizarLista(searchInput.value)

  const { error } = await supabase.from('lista_compras').delete().eq('id', id)
  if (error) {
    alert('Erro ao remover: ' + error.message)
    if (itemRemovido) {
      itens.push(itemRemovido)
      renderizarLista(searchInput.value)
    }
  }
}

async function logout() {
  if (!confirm('Tem certeza que deseja sair?')) return
  await supabase.auth.signOut()
  window.location.href = 'login.html'
}

// ============================================
// PESQUISA AVANÇADA
// ============================================
function handleSearch() {
  const termo = searchInput.value
  renderizarLista(termo)
  
  if (clearSearchBtn) {
    clearSearchBtn.style.display = termo.trim() ? 'flex' : 'none'
  }
}

function clearSearch() {
  searchInput.value = ''
  renderizarLista('')
  if (clearSearchBtn) clearSearchBtn.style.display = 'none'
  searchInput.focus()
}

// ============================================
// UTILITÁRIOS
// ============================================
function escapeHtml(text) {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

function formatarPreco(valor) {
  return Number(valor).toFixed(2).replace('.', ',')
}

// ============================================
// SETUP DE EVENTOS
// ============================================
function setupEventListeners() {
  if (adicionarBtn) {
    adicionarBtn.addEventListener('click', adicionarItem)
  }

  if (logoutBtn) {
    logoutBtn.addEventListener('click', logout)
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && document.activeElement === input) {
      event.preventDefault()
      adicionarItem()
    }
  })

  if (input) {
    input.addEventListener('input', () => atualizarSugestoesVisiveis())
    input.addEventListener('blur', () => {
      setTimeout(() => {
        if (sugestoesContainer) sugestoesContainer.style.display = 'none'
      }, 200)
    })
    input.addEventListener('focus', () => atualizarSugestoesVisiveis())
  }

  if (searchInput) {
    searchInput.addEventListener('input', handleSearch)
  }

  if (clearSearchBtn) {
    clearSearchBtn.addEventListener('click', clearSearch)
  }

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && sugestoesContainer) {
      sugestoesContainer.style.display = 'none'
    }
  })
}

// ============================================
// BOOT
// ============================================
async function init() {
  console.log('🚀 Inicializando Lista 2026 Premium...')

  initDOMElements()
  setupEventListeners()

  try {
    await getUser()
    console.log('✅ Usuário autenticado')
    await carregarLista()
    console.log('✅ Lista carregada')
    input.focus()
  } catch (error) {
    console.error('❌ Erro na inicialização:', error)
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}