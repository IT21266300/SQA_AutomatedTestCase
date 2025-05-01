// cypress/support/commands.js

// Custom command to login
Cypress.Commands.add('login', (email, password) => {
    cy.visit('/login');
    cy.get('input[name="email"]').type(email);
    cy.get('input[name="password"]').type(password);
    cy.get('button[type="submit"]').click();
    cy.url().should('not.include', '/login');
  });
  
  // Custom command to create a test order via API
  Cypress.Commands.add('createTestOrder', (customData = {}) => {
    const defaultOrder = {
      wasteType: 'CoconutHusk',
      quantity: 10,
      amount: 500,
      address: 'Test Address',
      phoneNumber: '1234567890',
      email: 'test-' + Date.now() + '@example.com'
    };
    
    const orderData = { ...defaultOrder, ...customData };
    
    return cy.request('POST', 'http://localhost:5000/api/orders/', orderData);
  });
  
  // Custom command to clean up test orders after tests
  Cypress.Commands.add('cleanupTestOrders', () => {
    cy.request('GET', 'http://localhost:5000/api/orders/')
      .then((response) => {
        if (response.body && response.body.length) {
          // Delete only test orders (with email containing example.com)
          response.body.forEach(order => {
            if (order.email && order.email.includes('example.com')) {
              cy.request('DELETE', `http://localhost:5000/api/orders/${order._id}`);
            }
          });
        }
      });
  });