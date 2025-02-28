// License Notice
console.log('TaskMaster - Licensed under CC BY-NC 4.0');

class TaskManager {
    constructor() {
        this.tasks = JSON.parse(localStorage.getItem('tasks')) || [];
        this.categories = JSON.parse(localStorage.getItem('categories')) || ['Personal', 'Work', 'Shopping'];
        this.currentCategory = 'All Tasks';
        this.taskContainer = document.querySelector('.tasks-container');
        this.categoryBtn = document.getElementById('showCategoriesBtn');
        this.categoryBtn.textContent = this.currentCategory;
        
        // Cache DOM elements
        this.categoriesOverlay = document.getElementById('categoriesOverlay');
        this.categoriesList = document.querySelector('.categories-list');
        this.taskInput = document.getElementById('taskInput');
        
        // Debounce save operations
        this.debouncedSave = this.debounce(() => {
            localStorage.setItem('tasks', JSON.stringify(this.tasks));
        }, 300);

        this.setupEventListeners();
        this.loadCategories();
        this.renderTasks();
    }

    // Add debounce utility
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    saveTasks() {
        this.debouncedSave();
    }

    setupEventListeners() {
        // Update task creation listeners
        const addTaskBtn = document.getElementById('addTaskBtn');
        const taskInput = document.getElementById('taskInput');

        addTaskBtn.addEventListener('click', () => this.addTask());
        taskInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });

        // Update category button event listeners
        const addCategoryBtn = document.getElementById('addCategoryBtn');
        const categoriesBtn = document.getElementById('showCategoriesBtn');
        const categoriesOverlay = document.getElementById('categoriesOverlay');
        const closeModalBtn = categoriesOverlay.querySelector('.close-modal');

        addCategoryBtn.addEventListener('click', () => {
            this.closeCategories(); // Close categories overlay first
            this.addCategory();
        });

        categoriesBtn.addEventListener('click', () => {
            this.loadCategories(); // Refresh categories list
            categoriesOverlay.style.display = 'flex';
            requestAnimationFrame(() => {
                categoriesOverlay.classList.add('visible');
            });
        });

        closeModalBtn.addEventListener('click', () => this.closeCategories());
        
        categoriesOverlay.addEventListener('click', (e) => {
            if (e.target === categoriesOverlay) {
                this.closeCategories();
            }
        });

        // Add keyboard support
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && categoriesOverlay.style.display === 'flex') {
                this.closeCategories();
            }
        });
    }

    loadCategories() {
        const categoriesList = document.querySelector('.categories-list');
        const currentCategory = document.getElementById('showCategoriesBtn').textContent;
        
        // Keep the system categories
        const systemItems = categoriesList.querySelectorAll('.system, .category-divider');
        categoriesList.innerHTML = '';
        systemItems.forEach(item => categoriesList.appendChild(item));
        
        // Add user categories
        this.categories.forEach(category => {
            const item = document.createElement('div');
            item.className = 'category-item' + (category === currentCategory ? ' selected' : '');
            item.innerHTML = `
                ${category}
                <button class="delete-category" aria-label="Delete category">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </button>
            `;
            
            item.addEventListener('click', (e) => {
                if (!e.target.classList.contains('delete-category')) {
                    this.filterTasks(category);
                    document.getElementById('showCategoriesBtn').textContent = category;
                    this.closeCategories();
                }
            });
            
            const deleteBtn = item.querySelector('.delete-category');
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteCategory(category);
            });
            
            categoriesList.appendChild(item);
        });

        // Add click handlers for system categories
        categoriesList.querySelectorAll('.category-item.system').forEach(item => {
            item.addEventListener('click', () => {
                const category = item.textContent.trim();
                this.filterTasks(category === 'All Tasks' ? 'all' : category.toLowerCase());
                document.getElementById('showCategoriesBtn').textContent = category;
                this.closeCategories();
            });
        });
    }

    addCategory() {
        const dialog = document.getElementById('categoryDialog');
        const input = document.getElementById('categoryInput');
        const confirmBtn = document.getElementById('confirmCategory');
        const cancelBtn = document.getElementById('cancelCategory');

        // Show dialog with animation
        dialog.style.display = 'flex';
        requestAnimationFrame(() => {
            dialog.classList.add('visible');
        });
        input.focus();

        // Handle confirm
        const handleConfirm = () => {
            const category = input.value.trim();
            if (category && !this.categories.includes(category)) {
                this.categories.push(category);
                localStorage.setItem('categories', JSON.stringify(this.categories));
                this.loadCategories();
                this.playSound('check');
            }
            closeDialog();
        };

        // Handle cancel
        const handleCancel = () => {
            closeDialog();
        };

        // Update closeDialog helper
        const closeDialog = () => {
            dialog.classList.remove('visible');
            setTimeout(() => {
                dialog.style.display = 'none';
                input.value = '';
            }, 300); // Match the transition duration
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            input.removeEventListener('keypress', handleKeypress);
        };

        // Handle enter key
        const handleKeypress = (e) => {
            if (e.key === 'Enter') {
                handleConfirm();
            }
        };

        // Add event listeners
        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', handleCancel);
        input.addEventListener('keypress', handleKeypress);

        // Close on outside click
        dialog.addEventListener('click', (e) => {
            if (e.target === dialog) {
                closeDialog();
            }
        }, { once: true });
    }

    addTask() {
        const taskText = this.taskInput.value.trim();
        if (!taskText) return;

        const task = {
            id: Date.now(),
            text: taskText,
            completed: false,
            category: ['All Tasks', 'Active', 'Completed'].includes(this.currentCategory) 
                ? 'Personal' : this.currentCategory,
            createdAt: Date.now()
        };

        this.tasks.push(task);
        this.taskInput.value = '';
        this.saveTasks();

        // Only render if in relevant category
        if (this.currentCategory === 'All Tasks' || this.currentCategory === task.category) {
            this.createTaskElement(task);
        }
        
        this.playSound('check');
    }

    deleteTask(taskId) {
        const taskElement = document.querySelector(`.task-item[data-id="${taskId}"]`);
        taskElement.classList.add('deleting');
        
        // Wait for animation to complete before removing
        setTimeout(() => {
            this.tasks = this.tasks.filter(task => task.id !== taskId);
            this.saveTasks();
            this.renderTasks();
            this.playSound('delete');
        }, 300);
    }

    toggleTask(taskId) {
        const task = this.tasks.find(task => task.id === taskId);
        if (task) {
            task.completed = !task.completed;
            this.saveTasks();
            
            // Update view based on current category
            const currentCategory = document.getElementById('showCategoriesBtn').textContent;
            this.filterTasks(currentCategory === 'All Tasks' ? 'all' : currentCategory.toLowerCase());
        }
    }

    filterTasks(category) {
        this.currentCategory = category;
        this.categoryBtn.textContent = category;
        
        // Clear container efficiently
        while (this.taskContainer.firstChild) {
            this.taskContainer.removeChild(this.taskContainer.firstChild);
        }

        // Create document fragment for batch DOM updates
        const fragment = document.createDocumentFragment();
        const tasks = this.getFilteredTasks(category);

        tasks.forEach(task => {
            const taskElement = this.createTaskElement(task);
            fragment.appendChild(taskElement);
        });

        this.taskContainer.appendChild(fragment);
    }

    getFilteredTasks(category) {
        let tasks = this.tasks;
        
        switch(category.toLowerCase()) {
            case 'completed':
                return tasks.filter(task => task.completed);
            case 'active':
                return tasks.filter(task => !task.completed);
            case 'all':
                return tasks;
            default:
                return tasks.filter(task => 
                    task.category === category && !task.completed
                );
        }
    }

    createTaskElement(task) {
        const taskElement = document.createElement('div');
        taskElement.className = `task-item ${task.completed ? 'completed' : ''}`;
        taskElement.dataset.id = task.id;
        
        taskElement.innerHTML = `
            <div class="task-content">
                <span class="task-text">${task.text}</span>
                <span class="task-category">${task.category}</span>
            </div>
            <div class="task-actions">
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <button class="delete-btn" aria-label="Delete task">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                </button>
            </div>
        `;

        // Use event delegation for better performance
        taskElement.querySelector('.task-checkbox').addEventListener('change', () => {
            this.toggleTask(task.id);
        });

        taskElement.querySelector('.delete-btn').addEventListener('click', () => {
            this.deleteTask(task.id);
        });

        this.taskContainer.appendChild(taskElement);
        requestAnimationFrame(() => taskElement.style.opacity = '1');
    }

    renderTasks() {
        const tasksContainer = document.querySelector('.tasks-container');
        const currentCategory = document.getElementById('showCategoriesBtn').textContent;
        
        // Clear current tasks
        tasksContainer.innerHTML = '';
        
        // Filter tasks based on current category
        let filteredTasks = this.tasks;
        if (currentCategory !== 'All Tasks') {
            filteredTasks = this.tasks.filter(task => task.category === currentCategory);
        }

        // Sort tasks: uncompleted first
        filteredTasks.sort((a, b) => {
            if (a.completed === b.completed) {
                return b.createdAt - a.createdAt;
            }
            return a.completed ? 1 : -1;
        });

        // Create task elements
        filteredTasks.forEach(task => this.createTaskElement(task));
    }

    playSound(type) {
        const sound = document.getElementById(`${type}Sound`);
        sound.currentTime = 0;
        sound.play().catch(err => console.log('Sound play failed:', err));
    }

    deleteCategory(category) {
        const dialog = document.getElementById('deleteDialog');
        const confirmBtn = document.getElementById('confirmDelete');
        const cancelBtn = document.getElementById('cancelDelete');

        dialog.style.display = 'flex';
        requestAnimationFrame(() => {
            dialog.querySelector('.dialog').classList.add('visible');
        });

        const handleConfirm = () => {
            this.categories = this.categories.filter(cat => cat !== category);
            localStorage.setItem('categories', JSON.stringify(this.categories));
            
            // Move tasks to Personal
            this.tasks.forEach(task => {
                if (task.category === category) {
                    task.category = 'Personal';
                }
            });
            this.saveTasks();
            
            this.loadCategories();
            this.filterTasks('all');
            this.playSound('delete');
            closeDialog();
        };

        const closeDialog = () => {
            dialog.querySelector('.dialog').classList.remove('visible');
            setTimeout(() => {
                dialog.style.display = 'none';
            }, 300);
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', closeDialog);
        };

        confirmBtn.addEventListener('click', handleConfirm);
        cancelBtn.addEventListener('click', closeDialog);
    }

    closeCategories() {
        const overlay = document.getElementById('categoriesOverlay');
        overlay.classList.remove('visible');
        setTimeout(() => {
            overlay.style.display = 'none';
        }, 300);
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const taskManager = new TaskManager();
    const themeToggle = document.getElementById('themeToggle');
    
    themeToggle.addEventListener('click', () => {
        const html = document.documentElement;
        const isDark = html.getAttribute('data-theme') === 'dark';
        html.setAttribute('data-theme', isDark ? 'light' : 'dark');
        localStorage.setItem('theme', isDark ? 'light' : 'dark');
    });

    // Load saved theme preference
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
});

// Service Worker Registration for offline functionality
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js')
        .then(registration => console.log('ServiceWorker registered'))
        .catch(err => console.log('ServiceWorker registration failed:', err));
}
