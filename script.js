class TaskManager {
    constructor() {
        this.highPriorityTasks = [];
        this.lowPriorityTasks = [];
        this.currentFilter = 'all';
        this.searchQuery = '';
        this.collapsedSections = {};
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.displayTasks();
        this.updateStats();
        this.setDefaultDate();
        this.showWelcomeToast();
    }

    bindEvents() {
        document.getElementById('addButton').addEventListener('click', () => this.addTask());
        document.getElementById('taskInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.addTask();
        });
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.displayTasks();
        });
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                e.target.closest('.filter-btn').classList.add('active');
                this.currentFilter = e.target.closest('.filter-btn').dataset.filter;
                this.displayTasks();
            });
        });
        document.getElementById('clearCompleted').addEventListener('click', () => this.clearCompleted());
        document.querySelectorAll('.collapse-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.closest('.collapse-btn').dataset.section;
                this.toggleSection(section);
            });
        });
    }

    setDefaultDate() {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('deadlineInput').value = tomorrow.toISOString().split('T')[0];
    }

    addTask() {
        const taskInput = document.getElementById('taskInput');
        const deadlineInput = document.getElementById('deadlineInput');
        const prioritySelect = document.getElementById('prioritySelect');
        
        if (!taskInput.value.trim()) {
            this.showToast('Please enter a task description', 'warning');
            taskInput.focus();
            return;
        }
        
        if (!deadlineInput.value) {
            this.showToast('Please select a deadline', 'warning');
            deadlineInput.focus();
            return;
        }

        const newTask = {
            id: Date.now(),
            description: taskInput.value.trim(),
            deadline: deadlineInput.value,
            done: false,
            createdAt: new Date(),
            priority: prioritySelect.value
        };

        // Determine priority based on deadline or manual selection
        const taskDeadline = new Date(deadlineInput.value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        let isHighPriority = false;
        
        if (prioritySelect.value === 'high') {
            isHighPriority = true;
        } else if (prioritySelect.value === 'low') {
            isHighPriority = false;
        } else {
            // Auto priority based on deadline
            const daysDiff = Math.ceil((taskDeadline - today) / (1000 * 60 * 60 * 24));
            isHighPriority = daysDiff <= 2;
        }

        if (isHighPriority) {
            this.highPriorityTasks.push(newTask);
        } else {
            this.lowPriorityTasks.push(newTask);
        }
        this.sortTasksByDeadline();
        
        this.displayTasks();
        this.updateStats();
        taskInput.value = '';
        prioritySelect.value = 'auto';
        this.setDefaultDate();
        this.showToast(`Task "${newTask.description}" added successfully!`, 'success');
        taskInput.focus();
    }

    sortTasksByDeadline() {
        this.highPriorityTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
        this.lowPriorityTasks.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    }

    displayTasks() {
        const highContainer = document.getElementById('highPriorityContainer');
        const lowContainer = document.getElementById('lowPriorityContainer');
        
        highContainer.innerHTML = '';
        lowContainer.innerHTML = '';

        // Filter and display high priority tasks
        const filteredHighTasks = this.filterTasks(this.highPriorityTasks);
        filteredHighTasks.forEach((task, index) => {
            const taskElement = this.createTaskElement(task, index, 'high');
            highContainer.appendChild(taskElement);
        });

        // Filter and display low priority tasks
        const filteredLowTasks = this.filterTasks(this.lowPriorityTasks);
        filteredLowTasks.forEach((task, index) => {
            const taskElement = this.createTaskElement(task, index, 'low');
            lowContainer.appendChild(taskElement);
        });

        // Update task counts
        document.getElementById('highPriorityCount').textContent = filteredHighTasks.length;
        document.getElementById('lowPriorityCount').textContent = filteredLowTasks.length;
        
        // Show empty state if no tasks
        if (filteredHighTasks.length === 0) {
            highContainer.innerHTML = '<div class="empty-state">No high priority tasks</div>';
        }
        
        if (filteredLowTasks.length === 0) {
            lowContainer.innerHTML = '<div class="empty-state">No low priority tasks</div>';
        }
    }

    filterTasks(tasks) {
        let filtered = tasks;

        // Apply search filter
        if (this.searchQuery) {
            filtered = filtered.filter(task => 
                task.description.toLowerCase().includes(this.searchQuery)
            );
        }

        // Apply status filter
        if (this.currentFilter === 'completed') {
            filtered = filtered.filter(task => task.done);
        } else if (this.currentFilter === 'pending') {
            filtered = filtered.filter(task => !task.done);
        }

        return filtered;
    }

    createTaskElement(task, index, priority) {
        const taskItem = document.createElement('div');
        taskItem.className = 'todo-item';
        if (task.done) taskItem.classList.add('completed');

        // Check if task is overdue
        const today = new Date();
        const taskDeadline = new Date(task.deadline);
        const isOverdue = taskDeadline < today && !task.done;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = task.done;
        checkbox.addEventListener('change', () => {
            task.done = checkbox.checked;
            this.displayTasks();
            this.updateStats();
            
            if (task.done) {
                this.showToast(`Task completed! 🎉`, 'success');
                this.animateTaskCompletion(taskItem);
            }
        });

        const label = document.createElement('label');
        label.textContent = task.description;
        
        const deadlineSpan = document.createElement('span');
        deadlineSpan.className = 'task-deadline';
        if (isOverdue) deadlineSpan.classList.add('overdue');
        
        const deadlineDate = new Date(task.deadline);
        const formattedDate = deadlineDate.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric',
            year: deadlineDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
        });
        
        deadlineSpan.innerHTML = `<i class="fas fa-calendar"></i> ${formattedDate}`;
        if (isOverdue) {
            deadlineSpan.innerHTML += ' <i class="fas fa-exclamation-triangle"></i>';
        }

        const deleteButton = document.createElement('button');
        deleteButton.className = 'delete-button';
        deleteButton.innerHTML = '<i class="fas fa-trash"></i>';
        deleteButton.addEventListener('click', () => {
            this.deleteTask(task.id, priority);
        });

        taskItem.appendChild(checkbox);
        taskItem.appendChild(label);
        taskItem.appendChild(deadlineSpan);
        taskItem.appendChild(deleteButton);

        return taskItem;
    }

    deleteTask(taskId, priority) {
        if (priority === 'high') {
            const index = this.highPriorityTasks.findIndex(task => task.id === taskId);
            if (index > -1) {
                const deletedTask = this.highPriorityTasks.splice(index, 1)[0];
                this.showToast(`Task "${deletedTask.description}" deleted`, 'warning');
            }
        } else {
            const index = this.lowPriorityTasks.findIndex(task => task.id === taskId);
            if (index > -1) {
                const deletedTask = this.lowPriorityTasks.splice(index, 1)[0];
                this.showToast(`Task "${deletedTask.description}" deleted`, 'warning');
            }
        }
        
        this.displayTasks();
        this.updateStats();
    }

    clearCompleted() {
        const highCompleted = this.highPriorityTasks.filter(task => task.done).length;
        const lowCompleted = this.lowPriorityTasks.filter(task => task.done).length;
        const totalCompleted = highCompleted + lowCompleted;
        
        if (totalCompleted === 0) {
            this.showToast('No completed tasks to clear', 'warning');
            return;
        }
        
        this.highPriorityTasks = this.highPriorityTasks.filter(task => !task.done);
        this.lowPriorityTasks = this.lowPriorityTasks.filter(task => !task.done);
        
        this.displayTasks();
        this.updateStats();
        this.showToast(`${totalCompleted} completed task${totalCompleted > 1 ? 's' : ''} cleared`, 'success');
    }

    toggleSection(section) {
        const container = document.getElementById(`${section}PriorityContainer`);
        const button = document.querySelector(`[data-section="${section}"]`);
        const icon = button.querySelector('i');
        
        if (this.collapsedSections[section]) {
            container.style.display = 'block';
            icon.className = 'fas fa-chevron-up';
            this.collapsedSections[section] = false;
        } else {
            container.style.display = 'none';
            icon.className = 'fas fa-chevron-down';
            this.collapsedSections[section] = true;
        }
    }

    updateStats() {
        const totalTasks = this.highPriorityTasks.length + this.lowPriorityTasks.length;
        const completedTasks = this.highPriorityTasks.filter(task => task.done).length + 
                              this.lowPriorityTasks.filter(task => task.done).length;
        const pendingTasks = totalTasks - completedTasks;
        this.animateNumber('totalTasks', totalTasks);
        this.animateNumber('completedTasks', completedTasks);
        this.animateNumber('pendingTasks', pendingTasks);
        const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
        document.getElementById('progressPercent').textContent = `${progressPercent}%`;
        document.getElementById('progressFill').style.width = `${progressPercent}%`;
    }

    animateNumber(elementId, targetNumber) {
        const element = document.getElementById(elementId);
        const currentNumber = parseInt(element.textContent) || 0;
        
        if (currentNumber === targetNumber) return;
        
        const increment = targetNumber > currentNumber ? 1 : -1;
        const duration = 300;
        const steps = Math.abs(targetNumber - currentNumber);
        const stepDuration = duration / steps;
        
        let current = currentNumber;
        const timer = setInterval(() => {
            current += increment;
            element.textContent = current;
            
            if (current === targetNumber) {
                clearInterval(timer);
            }
        }, stepDuration);
    }

    animateTaskCompletion(taskElement) {
        taskElement.style.transform = 'scale(1.05)';
        taskElement.style.background = 'rgba(76, 175, 80, 0.2)';
        
        setTimeout(() => {
            taskElement.style.transform = '';
            taskElement.style.background = '';
        }, 300);
    }

    showToast(message, type = 'success') {
        const toastContainer = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'fa-check-circle' : 
                    type === 'error' ? 'fa-exclamation-circle' : 
                    'fa-info-circle';
        
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;
        
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toastSlideOut 0.5s ease-out forwards';
            setTimeout(() => toastContainer.removeChild(toast), 500);
        }, 4000);
    }

    showWelcomeToast() {
        setTimeout(() => {
            this.showToast('Welcome to Planorama! Start adding your tasks 🚀', 'success');
        }, 1000);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.taskManager = new TaskManager();
});

const additionalStyles = `
    .empty-state {
        text-align: center;
        color: var(--text-secondary);
        font-style: italic;
        padding: 40px 20px;
        opacity: 0.7;
    }
    
    @keyframes toastSlideOut {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
    
    .todo-item {
        position: relative;
        overflow: hidden;
    }
    
    .todo-item::before {
        content: '';
        position: absolute;
        top: 0;
        left: -100%;
        width: 100%;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
        transition: left 0.5s ease;
    }
    
    .todo-item:hover::before {
        left: 100%;
    }
    
    /* Pulse animation for overdue tasks */
    @keyframes urgentPulse {
        0%, 100% { 
            box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.4);
        }
        50% { 
            box-shadow: 0 0 0 10px rgba(255, 107, 107, 0);
        }
    }
    
    .task-deadline.overdue {
        animation: urgentPulse 2s infinite;
    }
    
    /* Floating animation for particles */
    .particle {
        box-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
    }
    
    /* Enhanced button hover effects */
    .add-btn, .filter-btn, .clear-btn, .delete-button {
        position: relative;
        overflow: hidden;
    }
    
    .add-btn::before, .filter-btn::before, .clear-btn::before, .delete-button::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 50%;
        transform: translate(-50%, -50%);
        transition: width 0.3s ease, height 0.3s ease;
    }
    
    .add-btn:hover::before, .filter-btn:hover::before, .clear-btn:hover::before, .delete-button:hover::before {
        width: 200%;
        height: 200%;
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);