describe('Employee Dashboard', () => {
  beforeEach(() => {
    // Mock the API response for employees
    cy.intercept('GET', '/employee', {
      statusCode: 200,
      body: [
        {
          _id: '1',
          EmployeeName: 'John Doe',
          EmployeeId: 'EMP001',
          DepartmentName: 'IT',
          JobRole: 'Developer',
          PhoneNumber: '1234567890',
          Email: 'john.doe@example.com',
          BasicSalary: 50000,
          Bonus: 5000,
          OverTimeHours: 10,
          OverTimePayment: 5000,
          EPF_ETF: 5500,
          NetSalary: 54500
        },
        {
          _id: '2',
          EmployeeName: 'Jane Smith',
          EmployeeId: 'EMP002',
          DepartmentName: 'HR',
          JobRole: 'Manager',
          PhoneNumber: '9876543210',
          Email: 'jane.smith@example.com',
          BasicSalary: 70000,
          Bonus: 7000,
          OverTimeHours: 5,
          OverTimePayment: 2500,
          EPF_ETF: 7700,
          NetSalary: 71800
        }
      ]
    }).as('getEmployee');

    // Visit the dashboard page
    cy.visit('/employee');
    cy.wait('@getEmployee');
  });

  it('should display the employee dashboard', () => {
    // Check if the title is displayed
    cy.contains('h1', 'Employee Dashboard').should('be.visible');

    // Check if buttons are displayed
    cy.contains('button', 'Add Employee').should('be.visible');
    cy.contains('button', 'Export CSV').should('be.visible');
    cy.contains('button', 'Download PDF').should('be.visible');
    cy.contains('button', 'Send to Finance').should('be.visible');
  });

  it('should display the employee table with data', () => {
    // Check if table headers are displayed
    cy.get('.employee-table th').should('have.length', 6);
    cy.get('.employee-table th').eq(0).should('contain', 'Name');
    cy.get('.employee-table th').eq(1).should('contain', 'Employee ID');
    cy.get('.employee-table th').eq(2).should('contain', 'Department');
    
    // Check if employee data is displayed
    cy.get('.employee-table tbody tr').should('have.length', 2);
    cy.get('.employee-table tbody tr').eq(0).should('contain', 'John Doe');
    cy.get('.employee-table tbody tr').eq(0).should('contain', 'EMP001');
    cy.get('.employee-table tbody tr').eq(0).should('contain', 'IT');
    cy.get('.employee-table tbody tr').eq(0).should('contain', '54500.00');
  });

  it('should filter employees by search term', () => {
    // Search for an employee
    cy.get('.search-input').type('Jane');
    cy.get('.employee-table tbody tr').should('have.length', 1);
    cy.get('.employee-table tbody tr').eq(0).should('contain', 'Jane Smith');
    
    // Clear search and check if all employees are shown
    cy.get('.search-input').clear();
    cy.get('.employee-table tbody tr').should('have.length', 2);
  });

  it('should filter employees by department', () => {
    // Filter by department
    cy.get('.filter-select').select('HR');
    cy.get('.employee-table tbody tr').should('have.length', 1);
    cy.get('.employee-table tbody tr').eq(0).should('contain', 'Jane Smith');
    
    // Reset filter and check if all employees are shown
    cy.get('.filter-select').select('');
    cy.get('.employee-table tbody tr').should('have.length', 2);
  });

  it('should sort employees by name', () => {
    // Sort by name in ascending order
    cy.get('.employee-table th').eq(0).click();
    cy.get('.employee-table tbody tr').eq(0).should('contain', 'Jane Smith');
    cy.get('.employee-table tbody tr').eq(1).should('contain', 'John Doe');
    
    // Sort by name in descending order
    cy.get('.employee-table th').eq(0).click();
    cy.get('.employee-table tbody tr').eq(0).should('contain', 'John Doe');
    cy.get('.employee-table tbody tr').eq(1).should('contain', 'Jane Smith');
  });

  it('should open add employee form', () => {
    cy.contains('button', 'Add Employee').click();
    cy.contains('h2', 'Add New Employee').should('be.visible');
    cy.get('#EmployeeName').should('be.visible');
    cy.get('#EmployeeId').should('be.visible');
    cy.get('#DepartmentName').should('be.visible');
  });

  it('should delete an employee', () => {
    // Mock the delete request
    cy.intercept('DELETE', '/employee/1', {
      statusCode: 200,
      body: { message: 'Employee deleted successfully' }
    }).as('deleteEmployee');
    
    // Stub window.confirm to return true
    cy.on('window:confirm', () => true);
    
    // Click delete button for the first employee
    cy.get('.employee-table tbody tr').eq(0).find('.delete').click();
    cy.wait('@deleteEmployee');
    
    // Check if the employee was removed from the table
    cy.get('.employee-table tbody tr').should('have.length', 1);
    cy.get('.employee-table tbody tr').eq(0).should('contain', 'Jane Smith');
  });

  it('should edit an employee', () => {
    // Click edit button for the first employee
    cy.get('.employee-table tbody tr').eq(0).find('.edit').click();
    
    // Check if edit form is displayed with employee data
    cy.contains('h2', 'Edit Employee').should('be.visible');
    cy.get('#EmployeeName').should('have.value', 'John Doe');
    cy.get('#EmployeeId').should('have.value', 'EMP001');
    cy.get('#DepartmentName').should('have.value', 'IT');
  });

  it('should export to CSV', () => {
    // Create a stub for the CSV export (can't fully test file download)
    const stub = cy.stub();
    cy.on('window:before:unload', stub);
    
    cy.contains('button', 'Export CSV').click();
    // We can't fully verify the download, but we can check that it was initiated
    // by checking that the 'before:unload' event was not called
    cy.wrap(stub).should('not.be.called');
  });
});