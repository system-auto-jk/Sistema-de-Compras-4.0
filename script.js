// Global State
let lists = {};
let purchaseHistory = JSON.parse(localStorage.getItem('purchaseHistory')) || [];
let frequentItems = JSON.parse(localStorage.getItem('frequentItems')) || [];
let currentList = null;
let currentItemIndex = null;
let currentFilter = 'all';
let currentSearch = '';
let soundEnabled = JSON.parse(localStorage.getItem('soundEnabled') ?? 'true');
let onConfirmCallback = null;
let onCancelCallback = null;
let searchTimeout;
let touchStartX = 0;
let touchStartY = 0;
let currentSwipeItem = null;

// Initialize lists
try {
  lists = JSON.parse(localStorage.getItem('shoppingLists')) || {
    "Lista de Compras Padrão": [
      { name: "Arroz", brand: "", checked: false, price: 4.99, quantity: 2 },
      { name: "Feijão", brand: "", checked: false, price: 5.69, quantity: 2 },
      { name: "Açúcar", brand: "", checked: false, price: 4.15, quantity: 2 },
      { name: "Cuscuz", brand: "", checked: false, price: 1.75, quantity: 3 },
      { name: "Bolo", brand: "", checked: false, price: 7.49, quantity: 2 },
      { name: "Macarrão Normal", brand: "", checked: false, price: 2.10, quantity: 4 },
      { name: "Café", brand: "", checked: false, price: 17.89, quantity: 2 },
      { name: "Leite", brand: "", checked: false, price: 4.59, quantity: 4 },
      { name: "Ovo", brand: "", checked: false, price: 20.90, quantity: 1 },
      { name: "Tapioca", brand: "", checked: false, price: 7.49, quantity: 1 }
    ]
  };
} catch (e) {
  console.error('Erro ao carregar listas:', e);
  lists = { "Lista de Compras Padrão": [] };
}

// ============== NOTIFICATION SYSTEM ==============
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  
  if (soundEnabled && type === 'success') playSound();
  
  setTimeout(() => {
    toast.style.animation = 'slideDown 0.35s cubic-bezier(0.64, 0, 1, 0) reverse';
    setTimeout(() => toast.remove(), 350);
  }, 2500);
}

function playSound() {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.1);
  } catch (e) {
    console.log('Audio context error');
  }
}

// ============== DATA PERSISTENCE ==============
function saveLists() {
  try {
    localStorage.setItem('shoppingLists', JSON.stringify(lists));
    localStorage.setItem('purchaseHistory', JSON.stringify(purchaseHistory));
    localStorage.setItem('frequentItems', JSON.stringify(frequentItems));
  } catch (e) {
    showToast('Erro ao salvar: Armazenamento cheio', 'error');
  }
}

function updateSuggestions() {
  const uniqueItems = [...new Set(frequentItems)].slice(0, 50);
  const datalist = document.getElementById('suggestions');
  datalist.innerHTML = uniqueItems.map(name => `<option value="${name}">`).join('');
  const datalistShopping = document.getElementById('suggestions-shopping');
  datalistShopping.innerHTML = datalist.innerHTML;
}

// ============== MODAL FUNCTIONS ==============
function showWelcomeModal() {
  document.getElementById('welcomeModal').classList.remove('hidden');
  document.getElementById('selectListModal').classList.add('hidden');
  document.getElementById('manageListSection').classList.add('hidden');
  document.getElementById('shoppingView').classList.add('hidden');
  document.getElementById('floatingTotal').classList.add('hidden');
  updateNavState();
}

function showManageLists() {
  document.getElementById('welcomeModal').classList.add('hidden');
  document.getElementById('selectListModal').classList.add('hidden');
  document.getElementById('manageListSection').classList.remove('hidden');
  document.getElementById('shoppingView').classList.add('hidden');
  document.getElementById('floatingTotal').classList.add('hidden');
  updateListSelect();
}

function showSelectListModal() {
  document.getElementById('welcomeModal').classList.add('hidden');
  document.getElementById('selectListModal').classList.remove('hidden');
  document.getElementById('manageListSection').classList.add('hidden');
  document.getElementById('shoppingView').classList.add('hidden');
  document.getElementById('floatingTotal').classList.add('hidden');
  updateViewListSelect();
  updateNavState();
}

function showSettingsModal() {
  document.getElementById('settingsModal').classList.remove('hidden');
  document.getElementById('soundToggle').checked = soundEnabled;
}

function closeSettingsModal() {
  document.getElementById('settingsModal').classList.add('hidden');
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  localStorage.setItem('soundEnabled', JSON.stringify(soundEnabled));
  showToast('Preferência atualizada', 'success');
}

function clearAllData() {
  showConfirmModal('Limpar Tudo?', 'Isso vai deletar TODAS as listas e histórico. Essa ação não pode ser desfeita!', () => {
    lists = {};
    purchaseHistory = [];
    frequentItems = [];
    localStorage.clear();
    showToast('Dados limpos', 'success');
    closeSettingsModal();
    showWelcomeModal();
  });
}

// ============== LIST MANAGEMENT ==============
function updateViewListSelect() {
  const grid = document.getElementById('listGrid');
  grid.innerHTML = '';
  const noListsMessage = document.getElementById('noListsMessage');

  if (Object.keys(lists).length === 0) {
    noListsMessage.classList.remove('hidden');
  } else {
    noListsMessage.classList.add('hidden');
    for (const listName in lists) {
      const button = document.createElement('button');
      button.className = 'card-item text-left';
      button.style.margin = '0.5rem 0';
      button.onclick = () => {
        currentList = listName;
        confirmSelectList();
      };
      const itemCount = lists[listName].length;
      const checkedCount = lists[listName].filter(i => i.checked).length;
      button.innerHTML = `
        <div class="font-semibold text-cyan-400 text-sm">${listName}</div>
        <div class="text-xs text-gray-400 mt-1">${itemCount} itens • ${checkedCount} comprados</div>
        <div class="progress-bar mt-2">
          <div class="progress-bar-fill" style="width: ${itemCount > 0 ? (checkedCount / itemCount) * 100 : 0}%"></div>
        </div>
      `;
      grid.appendChild(button);
    }
  }
}

function confirmSelectList() {
  if (currentList && lists[currentList]) {
    document.getElementById('selectListModal').classList.add('hidden');
    document.getElementById('shoppingView').classList.remove('hidden');
    document.getElementById('floatingTotal').classList.remove('hidden');
    loadList();
  } else {
    showToast('Selecione uma lista válida', 'error');
  }
}

function createList() {
  const listName = document.getElementById('newListName').value.trim();
  if (!listName) {
    showToast('Digite um nome', 'error');
    return;
  }
  if (Object.keys(lists).some(name => name.toLowerCase() === listName.toLowerCase())) {
    showToast('Lista já existe', 'error');
    return;
  }
  lists[listName] = [];
  saveLists();
  document.getElementById('newListName').value = '';
  updateListSelect(listName);
  showToast(`"${listName}" criada`, 'success');
}

function duplicateList() {
  if (!currentList) {
    showToast('Selecione uma lista', 'error');
    return;
  }
  const baseName = currentList;
  let newName = `${baseName} (cópia)`;
  let counter = 1;
  while (Object.keys(lists).some(name => name.toLowerCase() === newName.toLowerCase())) {
    counter++;
    newName = `${baseName} (cópia ${counter})`;
  }
  lists[newName] = JSON.parse(JSON.stringify(lists[currentList]));
  saveLists();
  updateListSelect(newName);
  showToast(`Duplicada`, 'success');
}

function updateListSelect(selectedList = currentList) {
  const select = document.getElementById('listSelect');
  select.innerHTML = '<option value="">Selecione</option>';
  for (const listName in lists) {
    const option = document.createElement('option');
    option.value = listName;
    option.textContent = listName;
    if (listName === selectedList) option.selected = true;
    select.appendChild(option);
  }
  const hasList = !!selectedList && lists[selectedList];
  document.getElementById('exportButton').classList.toggle('hidden', !hasList);
  document.getElementById('exportPdfButton').classList.toggle('hidden', !hasList);
  document.getElementById('addItemSection').classList.toggle('hidden', !hasList);
  document.getElementById('deleteListButton').classList.toggle('hidden', !hasList);
  document.getElementById('duplicateListButton').classList.toggle('hidden', !hasList);
}

function loadList() {
  const listName = document.getElementById('listSelect').value || currentList;
  if (listName && lists[listName]) {
    currentList = listName;
    document.getElementById('listTitle').textContent = listName;
    currentFilter = 'all';
    currentSearch = '';
    document.getElementById('searchItem').value = '';
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-button')[0].classList.add('active');
    renderItems();
    updateListSelect(listName);
    showToast(`"${listName}" carregada`, 'success');
  }
}

// ============== ITEM MANAGEMENT ==============
function addItem() {
  let itemName, brand, quantity, clearInputs;
  
  if (!document.getElementById('shoppingView').classList.contains('hidden')) {
    itemName = document.getElementById('newItemShopping').value.trim();
    brand = document.getElementById('newItemBrandShopping').value.trim();
    quantity = parseInt(document.getElementById('newItemQuantityShopping').value) || 1;
    clearInputs = () => {
      document.getElementById('newItemShopping').value = '';
      document.getElementById('newItemBrandShopping').value = '';
      document.getElementById('newItemQuantityShopping').value = 1;
    };
  } else {
    itemName = document.getElementById('newItem').value.trim();
    brand = document.getElementById('newItemBrand').value.trim();
    quantity = parseInt(document.getElementById('newItemQuantity').value) || 1;
    clearInputs = () => {
      document.getElementById('newItem').value = '';
      document.getElementById('newItemBrand').value = '';
      document.getElementById('newItemQuantity').value = 1;
    };
  }

  if (!currentList) {
    showToast('Selecione uma lista', 'error');
    return;
  }
  if (!itemName || quantity <= 0) {
    showToast('Nome e quantidade inválidos', 'error');
    return;
  }
  if (lists[currentList].some(item => item.name.toLowerCase() === itemName.toLowerCase())) {
    showToast('Item já existe', 'error');
    return;
  }
  
  lists[currentList].push({ name: itemName, brand: brand || '', checked: false, price: 0, quantity });
  frequentItems.push(itemName);
  saveLists();
  updateSuggestions();
  clearInputs();
  renderItems();
  showToast(`"${itemName}" adicionado`, 'success');
}

function updateQuantity(index, value) {
  const quantity = parseInt(value);
  if (quantity > 0) {
    lists[currentList][index].quantity = quantity;
    saveLists();
    renderItems();
  } else {
    showToast('Quantidade deve ser > 0', 'error');
    renderItems();
  }
}

function toggleItem(index, checkbox) {
  const item = lists[currentList][index];
  if (checkbox.checked && !item.checked) {
    currentItemIndex = index;
    document.getElementById('modalItemName').textContent = `${item.name}${item.brand ? ' (' + item.brand + ')' : ''}`;
    document.getElementById('priceModal').classList.remove('hidden');
    document.getElementById('itemPrice').value = item.price || '';
    document.getElementById('itemQuantity').value = item.quantity || 1;
    updateItemTotal();
  } else if (!checkbox.checked && item.checked) {
    showConfirmModal('Desmarcar?', `Remover "${item.name}" da compra?`, () => {
      item.checked = false;
      item.price = 0;
      saveLists();
      renderItems();
      showToast('Item desmarcado', 'success');
    }, () => {
      checkbox.checked = true;
    });
  }
}

function updateItemTotal() {
  const price = parseFloat(document.getElementById('itemPrice').value) || 0;
  const quantity = parseInt(document.getElementById('itemQuantity').value) || 1;
  const total = (price * quantity).toFixed(2);
  document.getElementById('itemTotal').textContent = total;
}

function confirmPrice() {
  const price = parseFloat(document.getElementById('itemPrice').value);
  const quantity = parseInt(document.getElementById('itemQuantity').value);
  if (price >= 0 && quantity > 0) {
    const item = lists[currentList][currentItemIndex];
    item.checked = true;
    item.price = price;
    item.quantity = quantity;
    saveLists();
    document.getElementById('priceModal').classList.add('hidden');
    renderItems();
    showToast(`"${item.name}" comprado`, 'success');
  } else {
    showToast('Valores inválidos', 'error');
  }
}

function cancelPrice() {
  document.getElementById('priceModal').classList.add('hidden');
  const li = document.querySelector(`li[data-index="${currentItemIndex}"]`);
  if (li) {
    const checkbox = li.querySelector('input[type="checkbox"]');
    if (checkbox) checkbox.checked = false;
  }
  currentItemIndex = null;
}

function editItem(index) {
  const item = lists[currentList][index];
  currentItemIndex = index;
  document.getElementById('editItemName').textContent = `${item.name}${item.brand ? ' (' + item.brand + ')' : ''}`;
  document.getElementById('editName').value = item.name;
  document.getElementById('editBrand').value = item.brand || '';
  document.getElementById('editQuantity').value = item.quantity;
  if (item.checked) {
    document.getElementById('editPriceSection').classList.remove('hidden');
    document.getElementById('editPrice').value = item.price;
  } else {
    document.getElementById('editPriceSection').classList.add('hidden');
  }
  document.getElementById('editModal').classList.remove('hidden');
}

function confirmEdit() {
  const newName = document.getElementById('editName').value.trim();
  const newQuantity = parseInt(document.getElementById('editQuantity').value);
  
  if (!newName || newQuantity <= 0) {
    showToast('Nome e quantidade inválidos', 'error');
    return;
  }
  if (lists[currentList].some((item, idx) => idx !== currentItemIndex && item.name.toLowerCase() === newName.toLowerCase())) {
    showToast('Item com esse nome já existe', 'error');
    return;
  }
  
  const item = lists[currentList][currentItemIndex];
  item.name = newName;
  item.brand = document.getElementById('editBrand').value.trim();
  item.quantity = newQuantity;
  if (item.checked) {
    item.price = parseFloat(document.getElementById('editPrice').value) || 0;
  }
  frequentItems.push(newName);
  saveLists();
  updateSuggestions();
  document.getElementById('editModal').classList.add('hidden');
  renderItems();
  showToast('Item atualizado', 'success');
}

function cancelEdit() {
  document.getElementById('editModal').classList.add('hidden');
}

function startDelete(index) {
  const item = lists[currentList][index];
  currentItemIndex = index;
  showConfirmModal('Deletar?', `Remover "${item.name}"?`, () => {
    lists[currentList].splice(currentItemIndex, 1);
    saveLists();
    renderItems();
    showToast('Item deletado', 'success');
  });
}

// ============== FILTERING & SEARCH ==============
function setFilter(filter) {
  currentFilter = filter;
  document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
  event.target.classList.add('active');
  renderItems();
}

function searchItems() {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentSearch = document.getElementById('searchItem').value.trim().toLowerCase();
    renderItems();
  }, 300);
}

function filterItems() {
  let filteredItems = lists[currentList].map((item, originalIndex) => ({ ...item, originalIndex }))
    .filter(item => 
      item.name.toLowerCase().includes(currentSearch) || 
      (item.brand && item.brand.toLowerCase().includes(currentSearch))
    );

  if (currentFilter === 'alphabetical') {
    filteredItems.sort((a, b) => (a.name + (a.brand || '')).localeCompare(b.name + (b.brand || '')));
  } else if (currentFilter === 'checked') {
    filteredItems = filteredItems.filter(item => item.checked);
  } else if (currentFilter === 'unchecked') {
    filteredItems = filteredItems.filter(item => !item.checked);
  }
  
  return filteredItems;
}

// ============== RENDERING ==============
function renderItems() {
  if (!currentList) return;
  const itemList = document.getElementById('itemList');
  itemList.innerHTML = '';
  
  const filteredItems = filterItems();
  let total = 0;
  let checkedCount = 0;

  if (filteredItems.length === 0) {
    itemList.innerHTML = '<div class="empty-state"><i class="fas fa-inbox"></i><p>Nenhum item</p></div>';
  } else {
    filteredItems.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'flex items-center gap-2';
      li.setAttribute('data-index', item.originalIndex);
      
      if (item.checked) {
        checkedCount++;
        total += item.price * item.quantity;
      }
      
      li.innerHTML = `
        <input type="checkbox" ${item.checked ? 'checked' : ''} onchange="toggleItem(${item.originalIndex}, this)" class="checkbox-custom">
        <div class="item-info flex-1">
          <span class="item-name ${item.checked ? 'line-through text-gray-500' : 'text-gray-300'}">${item.name}${item.brand ? ' (' + item.brand + ')' : ''}</span>
        </div>
        <input type="number" min="1" value="${item.quantity}" onchange="updateQuantity(${item.originalIndex}, this.value)" class="quantity-input modern-input text-xs">
        ${item.checked ? `<span class="text-cyan-400 font-bold text-sm min-w-max">R$${item.price.toFixed(2)}</span>` : ''}
        <button onclick="editItem(${item.originalIndex})" class="icon-button text-xs" style="width: 40px; height: 40px;">
          <i class="fas fa-edit"></i>
        </button>
        <button onclick="startDelete(${item.originalIndex})" class="icon-button danger text-xs" style="width: 40px; height: 40px;">
          <i class="fas fa-trash"></i>
        </button>
      `;
      itemList.appendChild(li);
    });
  }

  const totalItems = lists[currentList].length;
  const totalChecked = lists[currentList].filter(i => i.checked).length;
  const progressPercent = totalItems > 0 ? (totalChecked / totalItems) * 100 : 0;
  
  document.getElementById('progressFill').style.width = progressPercent + '%';
  document.getElementById('progressText').textContent = `${totalChecked}/${totalItems}`;
  document.getElementById('totalPrice').textContent = total.toFixed(2);
}

function uncheckAllItems() {
  showConfirmModal('Desmarcar Todos?', `Deseja desmarcar todos os itens?`, () => {
    lists[currentList].forEach(item => {
      item.checked = false;
      item.price = 0;
    });
    saveLists();
    renderItems();
    showToast('Itens desmarcados', 'success');
  });
}

function toggleAddItemSection() {
  const section = document.getElementById('addItemShoppingSection');
  section.classList.toggle('hidden');
}

// ============== PURCHASE FINALIZATION ==============
function startFinalizePurchase() {
  if (!currentList) {
    showToast('Selecione uma lista', 'error');
    return;
  }
  const total = lists[currentList].reduce((sum, item) => item.checked ? sum + item.price * item.quantity : sum, 0).toFixed(2);
  const uncheckedItems = lists[currentList].filter(item => !item.checked);
  
  document.getElementById('finalizeTotalPrice').textContent = total;
  const uncheckedItemsList = document.getElementById('uncheckedItemsList');
  
  if (uncheckedItems.length === 0) {
    uncheckedItemsList.parentElement.innerHTML = '<p class="text-gray-400 text-sm">Todos os itens foram comprados! 🎉</p>';
  } else {
    uncheckedItemsList.innerHTML = '';
    uncheckedItems.forEach(item => {
      const li = document.createElement('li');
      li.textContent = `${item.name}${item.brand ? ' (' + item.brand + ')' : ''} - ${item.quantity} un`;
      uncheckedItemsList.appendChild(li);
    });
  }
  document.getElementById('finalizePurchaseModal').classList.remove('hidden');
}

function continueShopping() {
  document.getElementById('finalizePurchaseModal').classList.add('hidden');
}

function confirmFinalizePurchase() {
  document.getElementById('finalizePurchaseModal').classList.add('hidden');
  const total = lists[currentList].reduce((sum, item) => item.checked ? sum + item.price * item.quantity : sum, 0).toFixed(2);
  const checkedItems = lists[currentList].filter(item => item.checked);
  
  purchaseHistory.unshift({
    date: new Date().toISOString(),
    listName: currentList,
    total: parseFloat(total),
    items: checkedItems
  });
  if (purchaseHistory.length > 100) purchaseHistory = purchaseHistory.slice(0, 100);
  saveLists();
  
  document.getElementById('finalizedTotalPrice').textContent = total;
  document.getElementById('finalizedPurchaseModal').classList.remove('hidden');
}

function closeFinalizedModal() {
  document.getElementById('finalizedPurchaseModal').classList.add('hidden');
  showWelcomeModal();
}

// ============== HISTORY & STATS ==============
function showHistoryModal() {
  document.getElementById('welcomeModal').classList.add('hidden');
  const historyList = document.getElementById('historyList');
  historyList.innerHTML = '';
  
  if (purchaseHistory.length === 0) {
    historyList.innerHTML = '<li class="text-gray-500 text-sm">Nenhuma compra</li>';
  } else {
    purchaseHistory.forEach((entry, index) => {
      const li = document.createElement('li');
      const date = new Date(entry.date).toLocaleDateString('pt-BR');
      const total = entry.total.toFixed(2);
      li.innerHTML = `<div class="font-semibold text-cyan-400 text-sm">${date}</div><div class="text-xs text-gray-400">${entry.listName}: R$${total}</div>`;
      li.style.cursor = 'pointer';
      li.onclick = () => showHistoryDetails(index);
      historyList.appendChild(li);
    });
  }
  document.getElementById('historyModal').classList.remove('hidden');
  updateNavState();
}

function closeHistoryModal() {
  document.getElementById('historyModal').classList.add('hidden');
  showWelcomeModal();
}

function showHistoryDetails(index) {
  const entry = purchaseHistory[index];
  let details = `Lista: ${entry.listName}\nData: ${new Date(entry.date).toLocaleDateString('pt-BR')}\nTotal: R$${entry.total.toFixed(2)}\n\nItens:\n`;
  entry.items.forEach(item => {
    details += `${item.name}${item.brand ? ' (' + item.brand + ')' : ''} - ${item.quantity} un - R$${item.price.toFixed(2)}\n`;
  });
  const encodedDetails = encodeURIComponent(details);
  window.open(`https://wa.me/?text=${encodedDetails}`, '_blank');
  showToast('Exportado para WhatsApp', 'success');
}

function showStatsModal() {
  document.getElementById('historyModal').classList.add('hidden');
  const now = new Date();
  const currentMonth = now.toISOString().slice(0, 7);
  const monthly = purchaseHistory.filter(entry => entry.date.slice(0, 7) === currentMonth);
  const statsContent = document.getElementById('statsContent');
  
  if (monthly.length === 0) {
    statsContent.innerHTML = '<li class="text-gray-500 text-sm">Nenhuma compra neste mês</li>';
  } else {
    const totalMonthly = monthly.reduce((sum, entry) => sum + entry.total, 0).toFixed(2);
    const avgPerCompra = (totalMonthly / monthly.length).toFixed(2);
    statsContent.innerHTML = `
      <li class="font-semibold text-cyan-400 text-sm mb-1">Total: R$${totalMonthly}</li>
      <li class="font-semibold text-cyan-400 text-sm mb-2">Média: R$${avgPerCompra}</li>
      ${monthly.map(entry => `<li class="text-xs text-gray-400">${new Date(entry.date).toLocaleDateString('pt-BR')}: R$${entry.total.toFixed(2)}</li>`).join('')}
    `;
  }
  document.getElementById('statsModal').classList.remove('hidden');
}

function closeStatsModal() {
  document.getElementById('statsModal').classList.add('hidden');
  showHistoryModal();
}

function exportToWhatsApp() {
  if (!currentList) {
    showToast('Selecione uma lista', 'error');
    return;
  }
  const total = lists[currentList].reduce((sum, item) => item.checked ? sum + item.price * item.quantity : sum, 0).toFixed(2);
  let message = `📝 *${currentList}*\n\n`;
  const checkedItems = lists[currentList].filter(item => item.checked);
  const uncheckedItems = lists[currentList].filter(item => !item.checked);
  
  if (checkedItems.length > 0) {
    message += `✅ *Comprados:*\n`;
    checkedItems.forEach(item => {
      message += `• ${item.name}${item.brand ? ' (' + item.brand + ')' : ''} - ${item.quantity} un - R$${item.price.toFixed(2)}\n`;
    });
  }
  
  if (uncheckedItems.length > 0) {
    message += `\n❌ *Não Comprados:*\n`;
    uncheckedItems.forEach(item => {
      message += `• ${item.name}${item.brand ? ' (' + item.brand + ')' : ''} - ${item.quantity} un\n`;
    });
  }
  message += `\n💰 *Total: R$${total}*`;
  
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  showToast('Exportado para WhatsApp', 'success');
}

// ============== IMPORT/EXPORT ==============
async function importList() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.listName && Array.isArray(data.items)) {
        if (lists[data.listName]) {
          showToast('Lista já existe', 'error');
          return;
        }
        lists[data.listName] = data.items;
        saveLists();
        updateListSelect(data.listName);
        showToast(`"${data.listName}" importada`, 'success');
      } else {
        showToast('JSON inválido', 'error');
      }
    } catch (err) {
      showToast('Erro ao ler arquivo', 'error');
    }
  };
  input.click();
}

function exportList(format = 'json') {
  if (!currentList || !lists[currentList]) {
    showToast('Selecione uma lista', 'error');
    return;
  }
  
  const listData = {
    listName: currentList,
    items: lists[currentList],
    total: lists[currentList].reduce((sum, item) => item.checked ? sum + item.price * item.quantity : sum, 0).toFixed(2),
    dateSaved: new Date().toISOString()
  };
  
  if (format === 'json') {
    const blob = new Blob([JSON.stringify(listData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentList}_lista.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exportado como JSON', 'success');
  } else if (format === 'pdf') {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;
    
    doc.setFontSize(16);
    doc.text(`Lista: ${currentList}`, 20, y);
    y += 10;
    
    doc.setFontSize(11);
    doc.text(`Total: R$${listData.total}`, 20, y);
    y += 8;
    
    doc.setFontSize(9);
    listData.items.forEach(item => {
      if (y > 270) { doc.addPage(); y = 20; }
      const text = `${item.name}${item.brand ? ' (' + item.brand + ')' : ''} - ${item.quantity} un`;
      const price = item.checked ? `R$${item.price.toFixed(2)}` : 'Não comprado';
      doc.text(`${text}: ${price}`, 20, y);
      y += 6;
    });
    
    doc.save(`${currentList}_lista.pdf`);
    showToast('Exportado como PDF', 'success');
  }
}

// ============== DELETE FUNCTIONS ==============
function startDeleteList() {
  if (!currentList || !lists[currentList]) {
    showToast('Selecione uma lista', 'error');
    return;
  }
  showConfirmModal('Deletar Lista?', `Excluir "${currentList}"?`, () => {
    const listName = currentList;
    delete lists[listName];
    currentList = null;
    saveLists();
    updateListSelect();
    document.getElementById('shoppingView').classList.add('hidden');
    document.getElementById('floatingTotal').classList.add('hidden');
    showToast(`"${listName}" deletada`, 'success');
  });
}

// ============== CONFIRM MODAL ==============
function showConfirmModal(title, message, onConfirm, onCancel = null) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  onConfirmCallback = onConfirm;
  onCancelCallback = onCancel;
  document.getElementById('confirmModal').classList.remove('hidden');
}

function confirmConfirm() {
  if (onConfirmCallback) onConfirmCallback();
  document.getElementById('confirmModal').classList.add('hidden');
  onConfirmCallback = null;
  onCancelCallback = null;
}

function cancelConfirm() {
  if (onCancelCallback) onCancelCallback();
  document.getElementById('confirmModal').classList.add('hidden');
  onConfirmCallback = null;
  onCancelCallback = null;
}

// ============== SWIPE GESTURES ==============
document.addEventListener('touchstart', (e) => {
  const li = e.target.closest('.item-list li');
  if (li) {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    currentSwipeItem = li;
  }
}, { passive: true });

document.addEventListener('touchmove', (e) => {
  if (!currentSwipeItem) return;
  const touchCurrentX = e.touches[0].clientX;
  const diff = touchStartX - touchCurrentX;
  
  if (Math.abs(diff) > 30) {
    if (diff > 50) {
      currentSwipeItem.classList.add('swiped');
    } else if (diff < -50) {
      currentSwipeItem.classList.remove('swiped');
    }
  }
}, { passive: true });

document.addEventListener('touchend', (e) => {
  if (!currentSwipeItem) return;
  const touchEndX = e.changedTouches[0].clientX;
  const diff = touchStartX - touchEndX;
  
  if (diff > 80) {
    const index = parseInt(currentSwipeItem.getAttribute('data-index'));
    startDelete(index);
  }
  currentSwipeItem.classList.remove('swiped');
  currentSwipeItem = null;
}, { passive: true });

// ============== HELPERS ==============
function updateNavState() {
  document.querySelectorAll('.nav-item').forEach(btn => btn.classList.remove('active'));
  if (!document.getElementById('welcomeModal').classList.contains('hidden')) {
    document.querySelectorAll('.nav-item')[0]?.classList.add('active');
  } else if (!document.getElementById('selectListModal').classList.contains('hidden')) {
    document.querySelectorAll('.nav-item')[1]?.classList.add('active');
  } else if (!document.getElementById('historyModal').classList.contains('hidden')) {
    document.querySelectorAll('.nav-item')[3]?.classList.add('active');
  }
}

// ============== INITIALIZATION ==============
updateSuggestions();
document.getElementById('welcomeModal').classList.remove('hidden');
document.getElementById('selectListModal').classList.add('hidden');
document.getElementById('manageListSection').classList.add('hidden');
document.getElementById('shoppingView').classList.add('hidden');
document.getElementById('floatingTotal').classList.add('hidden');

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('itemPrice').addEventListener('input', updateItemTotal);
  document.getElementById('itemQuantity').addEventListener('input', updateItemTotal);
  
  window.addEventListener('orientationchange', () => {
    setTimeout(() => window.scrollTo(0, 0), 100);
  });
});

if (Object.keys(lists).length > 0) {
  updateListSelect();
}
