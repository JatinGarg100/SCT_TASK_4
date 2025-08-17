document.addEventListener('DOMContentLoaded', function() {
    const dateDisplay = document.getElementById('date-display');
    const taskInput = document.getElementById('task-input');
    const addTaskBtn = document.getElementById('add-task-btn');
    const taskList = document.getElementById('task-list');
    const taskCount = document.getElementById('task-count');
    const clearCompletedBtn = document.getElementById('clear-completed');
    const listMenu = document.getElementById('list-menu');
    const customLists = document.getElementById('custom-lists');
    const newListBtn = document.getElementById('new-list-btn');
    const filters = document.querySelectorAll('.filter');
    const listModal = document.getElementById('list-modal');
    const taskModal = document.getElementById('task-modal');
    const closeModalBtns = document.querySelectorAll('.close-modal');
    const saveListBtn = document.getElementById('save-list-btn');
    const newListName = document.getElementById('new-list-name');
    const colorOptions = document.querySelectorAll('.color-option');
    const saveTaskBtn = document.getElementById('save-task-btn');
    const deleteTaskBtn = document.getElementById('delete-task-btn');
    const editTaskInput = document.getElementById('edit-task-input');
    const taskDateInput = document.getElementById('task-date');
    const taskTimeInput = document.getElementById('task-time');
    const taskPrioritySelect = document.getElementById('task-priority');
    
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let lists = JSON.parse(localStorage.getItem('lists')) || [
        { id: 'work', name: 'Work', color: '#48dbfb' },
        { id: 'personal', name: 'Personal', color: '#1dd1a1' }
    ];
    let currentList = 'default';
    let currentFilter = 'all';
    let selectedColor = '#6c5ce7';
    let currentTaskId = null;
    
    function init() {
        updateDateDisplay();
        renderLists();
        renderTasks();
        setupEventListeners();
    }
    
    function updateDateDisplay() {
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const today = new Date();
        dateDisplay.textContent = today.toLocaleDateString('en-US', options);
    }
    
    function renderLists() {
        customLists.innerHTML = '';
        
        lists.forEach(list => {
            const listItem = document.createElement('li');
            listItem.className = 'custom-list-item';
            listItem.dataset.listId = list.id;
            listItem.innerHTML = `
                <span style="background-color: ${list.color}" class="list-color-badge"></span>
                ${list.name}
                <button class="delete-list-btn" data-list-id="${list.id}">
                    <i class="fas fa-trash"></i>
                </button>
            `;
            
            if (currentList === list.id) {
                listItem.classList.add('active');
            }
            
            customLists.appendChild(listItem);
        });
        document.querySelectorAll('.delete-list-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const listId = this.dataset.listId;
                deleteList(listId);
            });
        });
    }
    function renderTasks() {
        taskList.innerHTML = '';
        
        let filteredTasks = tasks.filter(task => {
            if (currentList === 'today') {
                const today = new Date().toISOString().split('T')[0];
                return task.dueDate === today;
            } else if (currentList === 'important') {
                return task.important;
            } else if (currentList !== 'default') {
                return task.listId === currentList;
            }
            return true;
        });
        
        if (currentFilter === 'active') {
            filteredTasks = filteredTasks.filter(task => !task.completed);
        } else if (currentFilter === 'completed') {
            filteredTasks = filteredTasks.filter(task => task.completed);
        }
        
        filteredTasks.sort((a, b) => {
            if (a.completed !== b.completed) {
                return a.completed ? 1 : -1;
            }
            
            if (a.dueDate && b.dueDate) {
                if (a.dueDate !== b.dueDate) {
                    return new Date(a.dueDate) - new Date(b.dueDate);
                }
            } else if (a.dueDate) {
                return -1;
            } else if (b.dueDate) {
                return 1;
            }
            
            const priorityOrder = { high: 1, medium: 2, low: 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        });
        
        if (filteredTasks.length === 0) {
            taskList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <p>No tasks found</p>
                </div>
            `;
        } else {
            filteredTasks.forEach(task => {
                const taskItem = document.createElement('div');
                taskItem.className = `task-item priority-${task.priority}`;
                if (task.completed) {
                    taskItem.classList.add('completed');
                }
                taskItem.dataset.taskId = task.id;
                
                const dueDate = task.dueDate ? new Date(task.dueDate) : null;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                let dueText = '';
                if (dueDate) {
                    if (dueDate.toISOString().split('T')[0] === today.toISOString().split('T')[0]) {
                        dueText = 'Today';
                    } else {
                        dueText = dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    }
                    
                    if (task.time) {
                        dueText += ` at ${task.time}`;
                    }
                }
                
                taskItem.innerHTML = `
                    <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                    <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
                    ${dueText ? `<span class="task-due"><i class="fas fa-clock"></i>${dueText}</span>` : ''}
                    <div class="task-actions">
                        <button class="task-btn important ${task.important ? 'active' : ''}">
                            <i class="fas fa-exclamation"></i>
                        </button>
                        <button class="task-btn edit-btn">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="task-btn delete-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                taskList.appendChild(taskItem);
            });
        }
        
        const activeTasks = tasks.filter(task => !task.completed).length;
        taskCount.textContent = `${activeTasks} ${activeTasks === 1 ? 'task' : 'tasks'} remaining`;
    }
    
    function addTask() {
        const text = taskInput.value.trim();
        if (!text) return;
        
        const newTask = {
            id: Date.now().toString(),
            text,
            completed: false,
            important: false,
            listId: currentList === 'default' ? null : currentList,
            priority: 'medium',
            createdAt: new Date().toISOString()
        };
        
        tasks.push(newTask);
        saveTasks();
        taskInput.value = '';
        renderTasks();
    }
    
    function toggleTaskCompletion(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.completed = !task.completed;
            saveTasks();
            renderTasks();
        }
    }
    
    function toggleTaskImportance(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (task) {
            task.important = !task.important;
            saveTasks();
            renderTasks();
        }
    }
    
    function editTask(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        currentTaskId = taskId;
        editTaskInput.value = task.text;
        taskDateInput.value = task.dueDate || '';
        taskTimeInput.value = task.time || '';
        taskPrioritySelect.value = task.priority || 'medium';
        
        document.getElementById('task-modal-title').textContent = 'Edit Task';
        taskModal.style.display = 'flex';
    }
    
    function saveEditedTask() {
        const task = tasks.find(t => t.id === currentTaskId);
        if (!task) return;
        
        task.text = editTaskInput.value.trim();
        task.dueDate = taskDateInput.value;
        task.time = taskTimeInput.value;
        task.priority = taskPrioritySelect.value;
        
        saveTasks();
        renderTasks();
        closeModal(taskModal);
    }
    
    function deleteTask() {
        tasks = tasks.filter(t => t.id !== currentTaskId);
        saveTasks();
        renderTasks();
        closeModal(taskModal);
    }
    
    function clearCompletedTasks() {
        tasks = tasks.filter(task => !task.completed);
        saveTasks();
        renderTasks();
    }
    
    function createNewList() {
        const name = newListName.value.trim();
        if (!name) return;
        
        const newList = {
            id: Date.now().toString(),
            name,
            color: selectedColor
        };
        
        lists.push(newList);
        saveLists();
        renderLists();
        closeModal(listModal);
        newListName.value = '';
    }
    
    function deleteList(listId) {
        if (confirm('Are you sure you want to delete this list? Tasks in this list will not be deleted.')) {
            lists = lists.filter(list => list.id !== listId);
            
            if (currentList === listId) {
                currentList = 'default';
                document.querySelector(`.list-menu li[data-list-id="default"]`).classList.add('active');
            }
            
            saveLists();
            renderLists();
            renderTasks();
        }
    }
    
    function changeList(listId) {
        currentList = listId;
        
        document.querySelectorAll('.list-menu li, .custom-list-item').forEach(item => {
            item.classList.remove('active');
        });
        
        const activeItem = document.querySelector(`[data-list-id="${listId}"]`);
        if (activeItem) {
            activeItem.classList.add('active');
        }
        
        renderTasks();
    }
    
    function changeFilter(filter) {
        currentFilter = filter;
        
        document.querySelectorAll('.filter').forEach(f => {
            f.classList.remove('active');
        });
        
        document.querySelector(`.filter[data-filter="${filter}"]`).classList.add('active');
        
        renderTasks();
    }
    
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }
    
    function saveLists() {
        localStorage.setItem('lists', JSON.stringify(lists));
    }
    
    function openModal(modal) {
        modal.style.display = 'flex';
    }
    
    function closeModal(modal) {
        modal.style.display = 'none';
    }
    function setupEventListeners() {
        addTaskBtn.addEventListener('click', addTask);
        taskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') addTask();
        });
        
        taskList.addEventListener('click', function(e) {
            const taskItem = e.target.closest('.task-item');
            if (!taskItem) return;
            
            const taskId = taskItem.dataset.taskId;
            
            if (e.target.classList.contains('task-checkbox') || e.target.closest('.task-checkbox')) {
                toggleTaskCompletion(taskId);
            } else if (e.target.classList.contains('important') || e.target.closest('.important')) {
                e.stopPropagation();
                toggleTaskImportance(taskId);
            } else if (e.target.classList.contains('edit-btn') || e.target.closest('.edit-btn')) {
                e.stopPropagation();
                editTask(taskId);
            } else if (e.target.classList.contains('delete-btn') || e.target.closest('.delete-btn')) {
                e.stopPropagation();
                currentTaskId = taskId;
                if (confirm('Are you sure you want to delete this task?')) {
                    deleteTask();
                }
            }
        });
        
        clearCompletedBtn.addEventListener('click', clearCompletedTasks);
        
        listMenu.addEventListener('click', function(e) {
            const listItem = e.target.closest('li');
            if (listItem) {
                changeList(listItem.dataset.listId);
            }
        });
        
        customLists.addEventListener('click', function(e) {
            const listItem = e.target.closest('.custom-list-item');
            if (listItem) {
                changeList(listItem.dataset.listId);
            }
        });
        
        document.querySelectorAll('.filter').forEach(filter => {
            filter.addEventListener('click', function() {
                changeFilter(this.dataset.filter);
            });
        });
        
        newListBtn.addEventListener('click', () => openModal(listModal));
        saveListBtn.addEventListener('click', createNewList);
        
        saveTaskBtn.addEventListener('click', saveEditedTask);
        deleteTaskBtn.addEventListener('click', deleteTask);
        
        colorOptions.forEach(option => {
            option.addEventListener('click', function() {
                colorOptions.forEach(opt => opt.classList.remove('selected'));
                this.classList.add('selected');
                selectedColor = this.dataset.color;
            });
        });
        
        closeModalBtns.forEach(btn => {
            btn.addEventListener('click', function() {
                closeModal(this.closest('.modal'));
            });
        });
        
        window.addEventListener('click', function(e) {
            if (e.target.classList.contains('modal')) {
                closeModal(e.target);
            }
        });
    }
    
    init();
});
