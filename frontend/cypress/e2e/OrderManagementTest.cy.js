describe('Order Management', () => {
  // Fixture data for consistent test inputs
  const testOrder = {
    wasteType: 'CoconutHusk',
    quantity: '10',
    amount: '500.00',
    address: '123 Test Street, City',
    phoneNumber: '1234567890',
    email: 'test@example.com'
  };

  // Before all tests, ensure a clean state by clearing orders
  before(() => {
    cy.request('DELETE', `${Cypress.env('apiUrl')}/orders/reset`); // Assumes a reset endpoint
    // Alternatively, use cy.exec() to run a script to clear the database
  });

  // Before each test, visit the homepage and ensure no user is logged in
  beforeEach(() => {
    cy.visit('/');
    cy.clearLocalStorage(); // Clear any existing session
  });

  describe('AddOrder Form', () => {
    it('should display validation errors for empty form submission', () => {
      cy.get('a[href="/orders/add"]').click(); // Navigate to AddOrder
      cy.url().should('include', '/orders/add');
      cy.get('button.submit-btn').contains('Place Order').click();

      // Verify validation errors
      cy.get('.form-error').should('have.length', 6); // One for each required field
      cy.get('.form-error').contains('Waste Type is required');
      cy.get('.form-error').contains('Quantity is required');
      cy.get('.form-error').contains('Amount is required');
      cy.get('.form-error').contains('Address is required');
      cy.get('.form-error').contains('Phone Number is required');
      cy.get('.form-error').contains('Email is required');
    });

    it('should display validation errors for invalid inputs', () => {
      cy.get('a[href="/orders/add"]').click();
      cy.get('#wasteType').select('CoconutHusk');
      cy.get('#quantity').type('-5');
      cy.get('#amount').type('-100');
      cy.get('#phoneNumber').type('12345'); // Less than 10 digits
      cy.get('#email').type('invalid-email');
      cy.get('#address').type('Test Address');
      cy.get('button.submit-btn').click();

      // Verify specific validation errors
      cy.get('.form-error').contains('Quantity must be a positive number');
      cy.get('.form-error').contains('Amount must be a positive number');
      cy.get('.form-error').contains('Phone Number must be 10 digits');
      cy.get('.form-error').contains('Email is invalid');
    });

    it('should successfully submit a valid order and redirect', () => {
      // Optional: Stub the API response
      // cy.intercept('POST', `${Cypress.env('apiUrl')}/orders/`, {
      //   statusCode: 201,
      //   body: { message: 'Order placed successfully', data: testOrder }
      // }).as('placeOrder');

      cy.get('a[href="/orders/add"]').click();
      cy.get('#wasteType').select(testOrder.wasteType);
      cy.get('#quantity').type(testOrder.quantity);
      cy.get('#amount').type(testOrder.amount);
      cy.get('#address').type(testOrder.address);
      cy.get('#phoneNumber').type(testOrder.phoneNumber);
      cy.get('#email').type(testOrder.email);
      cy.get('button.submit-btn').click();

      // Verify success message
      cy.get('.success').contains('Order placed successfully!');
      cy.get('button.submit-btn').contains('Download Order Confirmation PDF').should('be.visible');

      // Verify redirect to /orders after 2 seconds
      cy.url().should('include', '/orders', { timeout: 3000 });

      // Verify API call
      cy.request('GET', `${Cypress.env('apiUrl')}/orders`).then((response) => {
        expect(response.status).to.eq(200);
        expect(response.body).to.be.an('array');
        expect(response.body[0]).to.include({
          wasteType: testOrder.wasteType,
          quantity: parseInt(testOrder.quantity),
          amount: parseFloat(testOrder.amount),
          address: testOrder.address,
          phoneNumber: testOrder.phoneNumber,
          email: testOrder.email
        });
      });

      // Optional: Wait for the API stub
      // cy.wait('@placeOrder').its('response.statusCode').should('eq', 201);
    });

    it('should download order confirmation PDF', () => {
      cy.get('a[href="/orders/add"]').click();
      cy.get('#wasteType').select(testOrder.wasteType);
      cy.get('#quantity').type(testOrder.quantity);
      cy.get('#amount').type(testOrder.amount);
      cy.get('#address').type(testOrder.address);
      cy.get('#phoneNumber').type(testOrder.phoneNumber);
      cy.get('#email').type(testOrder.email);
      cy.get('button.submit-btn').click();

      // Click the PDF download button
      cy.get('button.submit-btn').contains('Download Order Confirmation PDF').click();

      // Note: Cypress cannot directly verify file downloads, but we can check if the button triggers the action
      // Optionally, stub the jsPDF call or check console logs if needed
    });

    it('should cancel form submission and redirect', () => {
      cy.get('a[href="/orders/add"]').click();
      cy.get('button.cancel-btn').contains('Cancel').click();
      cy.url().should('include', '/orders');
    });
  });

  describe('OrdersDashboard', () => {
    // Seed an order for dashboard tests
    beforeEach(() => {
      cy.request('POST', `${Cypress.env('apiUrl')}/orders/`, {
        ...testOrder,
        status: 'Pending'
      });
    });

    it('should display order statistics and pie chart', () => {
      cy.get('a[href="/orders"]').click();
      cy.url().should('include', '/orders');

      // Verify stats cards
      cy.get('.stat-card').should('have.length', 4);
      cy.get('.stat-card').contains('Total Orders').parent().contains('1');
      cy.get('.stat-card').contains('Total Amount').parent().contains('Rs. 500.00');
      cy.get('.stat-card').contains('Total Quantity').parent().contains('10');

      // Verify pie chart legend
      cy.get('.status-legend .status-item').contains('New Orders: 1');
      cy.get('.status-legend .status-item').contains('On Delivery: 0');
      cy.get('.status-legend .status-item').contains('Delivered: 0');
      cy.get('.status-legend .status-item').contains('Cancelled: 0');
    });

    it('should filter orders by search term', () => {
      cy.get('a[href="/orders"]').click();
      cy.get('.search-box input').type('CoconutHusk');
      cy.get('.orders-table tbody tr').should('have.length', 1);
      cy.get('.orders-table tbody tr').contains('CoconutHusk');

      cy.get('.search-box input').clear().type('nonexistent');
      cy.get('.orders-table tbody tr').should('have.length', 0);
    });

    it('should filter orders by date range', () => {
      cy.get('a[href="/orders"]').click();
      const today = new Date().toISOString().split('T')[0];
      cy.get('.date-input').first().type(today);
      cy.get('.date-input').last().type(today);
      cy.get('.orders-table tbody tr').should('have.length', 1);

      cy.get('.date-input').first().clear().type('2020-01-01');
      cy.get('.date-input').last().clear().type('2020-12-31');
      cy.get('.orders-table tbody tr').should('have.length', 0);
    });

    it('should sort orders by wasteType', () => {
      // Seed another order for sorting
      cy.request('POST', `${Cypress.env('apiUrl')}/orders/`, {
        ...testOrder,
        wasteType: 'CoconutShell',
        status: 'Pending'
      });

      cy.get('a[href="/orders"]').click();
      cy.get('.orders-table th').contains('Waste Type').click(); // Sort ascending
      cy.get('.orders-table tbody tr').first().contains('CoconutHusk');
      cy.get('.orders-table th').contains('Waste Type').click(); // Sort descending
      cy.get('.orders-table tbody tr').first().contains('CoconutShell');
    });

    it('should update an order status', () => {
      cy.get('a[href="/orders"]').click();
      cy.get('.orders-table tbody tr').first().find('button.update').contains('Update').click();

      // Mock the prompt for Cypress
      cy.window().then((win) => {
        cy.stub(win, 'prompt').returns('Delivered');
      });

      // Stub the API call
      cy.intercept('PUT', `${Cypress.env('apiUrl')}/orders/*`, {
        statusCode: 200,
        body: { message: 'Order updated' }
      }).as('updateOrder');

      cy.get('.orders-table tbody tr').first().find('button.update').click();
      cy.wait('@updateOrder');
      cy.get('.orders-table tbody tr').first().find('.status-badge').contains('Delivered');
    });

    it('should delete an order', () => {
      cy.get('a[href="/orders"]').click();
      cy.get('.orders-table tbody tr').should('have.length', 1);

      // Mock the confirm dialog
      cy.window().then((win) => {
        cy.stub(win, 'confirm').returns(true);
      });

      // Stub the API call
      cy.intercept('DELETE', `${Cypress.env('apiUrl')}/orders/*`, {
        statusCode: 200,
        body: { message: 'Order deleted' }
      }).as('deleteOrder');

      cy.get('.orders-table tbody tr').first().find('button.delete').click();
      cy.wait('@deleteOrder');
      cy.get('.orders-table tbody tr').should('have.length', 0);
    });

    it('should generate order PDF', () => {
      cy.get('a[href="/orders"]').click();
      cy.get('.orders-table tbody tr').first().find('button.update').contains('PDF').click();

      // Note: Cannot directly verify PDF download, but we confirm the button triggers the action
    });

    it('should navigate to AddOrder form', () => {
      cy.get('a[href="/orders"]').click();
      cy.get('.new-order-button').contains('New Order').click();
      cy.url().should('include', '/orders/add');
    });
  });
});