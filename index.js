// Menu toggle functionality
const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
const sidebar = document.getElementById('sidebar');
const closeSidebar = document.querySelector('.close-sidebar');

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', function() {
        sidebar.classList.toggle('active');
    });
}

if (closeSidebar) {
    closeSidebar.addEventListener('click', function() {
        sidebar.classList.remove('active');
    });
}

// Close sidebar when clicking outside
document.addEventListener('click', function(event) {
    const isClickInsideSidebar = sidebar.contains(event.target);
    const isClickOnMenuBtn = mobileMenuBtn.contains(event.target);
    
    if (!isClickInsideSidebar && !isClickOnMenuBtn && sidebar.classList.contains('active')) {
        sidebar.classList.remove('active');
    }
});

// Navigation functionality
document.querySelectorAll(".navList").forEach(function(element) {
    element.addEventListener('click', function() {
        // Close sidebar on mobile after selection
        if (window.innerWidth <= 768) {
            sidebar.classList.remove('active');
        }
      
        document.querySelectorAll(".navList").forEach(function(e) {
            e.classList.remove('active');
        });

        // Add active class to the clicked navList element
        this.classList.add('active');

        // Get the index of the clicked navList element
        var index = Array.from(this.parentNode.children).indexOf(this);

        // Hide all data-table elements
        document.querySelectorAll(".data-table").forEach(function(table) {
            table.style.display = 'none';
        });

        // Show the corresponding table based on the clicked index
        var tables = document.querySelectorAll(".data-table");
        if (tables.length > index) {
            tables[index].style.display = 'block';
        }
    });
});

// Window resize event to handle responsive behavior
window.addEventListener('resize', function() {
    if (window.innerWidth > 768) {
        sidebar.classList.remove('active');
    }
});

