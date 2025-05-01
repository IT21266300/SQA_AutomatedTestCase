// cypress/e2e/order-management-tests.cy.js

describe('Order Management System Tests', () => {
    beforeEach(() => {
      // Visit the login page and log in
      cy.visit('/login');
      cy.get('input[name="email"]').type('vihinsa2@gmail.com');
      cy.get('input[name="password"]').type('0714397766');
      cy.get('button[type="submit"]').click();
      
      // Verify login was successful
      cy.url().should('not.include', '/login');
    });
  
    describe('Order Creation', () => {
      it('should display the add order form', () => {
        cy.visit('/orders/add');
        cy.get('.add-order-form h1').should('contain', 'Add New Order');
        cy.get('select[name="wasteType"]').should('exist');
        cy.get('input[name="quantity"]').should('exist');
        cy.get('input[name="amount"]').should('exist');
        cy.get('input[name="address"]').should('exist');
        cy.get('input[name="phoneNumber"]').should('exist');
        cy.get('input[name="email"]').should('exist');
      });
  
      it('should validate input fields correctly', () => {
        cy.visit('/orders/add');
        
        // Submit without filling required fields
        cy.get('button[type="submit"]').click();
        
        // Check for error messages
        cy.get('.form-error').should('have.length.at.least', 1);
        
        // Fill in the form with invalid data
        cy.get('select[name="wasteType"]').select('CoconutHusk');
        cy.get('input[name="quantity"]').type('-5'); // Negative value
        cy.get('input[name="amount"]').type('0'); // Zero value
        cy.get('input[name="address"]').type('Test Address');
        cy.get('input[name="phoneNumber"]').type('123'); // Too short
        cy.get('input[name="email"]').type('invalid-email'); // Invalid format
        
        // Submit the form
        cy.get('button[type="submit"]').click();
        
        // Check for specific error messages
        cy.get('.form-error').should('contain', 'Quantity must be a positive number');
        cy.get('.form-error').should('contain', 'Amount must be a positive number');
        cy.get('.form-error').should('contain', 'Phone Number must be 10 digits');
        cy.get('.form-error').should('contain', 'Email is invalid');
      });
  
      it('should successfully submit a valid order', () => {
        cy.visit('/orders/add');
        
        // Fill in the form correctly
        cy.get('select[name="wasteType"]').select('CoconutHusk');
        cy.get('input[name="quantity"]').type('10');
        cy.get('input[name="amount"]').type('500');
        cy.get('input[name="address"]').type('123 Test Street');
        cy.get('input[name="phoneNumber"]').type('1234567890');
        cy.get('input[name="email"]').type('test@example.com');
        
        // Intercept the POST request
        cy.intercept('POST', 'http://localhost:5000/api/orders/').as('createOrder');
        
        // Submit the form
        cy.get('button[type="submit"]').click();
        
        // Wait for the request to complete
        cy.wait('@createOrder').then((interception) => {
          expect(interception.response.statusCode).to.equal(200);
        });
        
        // Check for success message
        cy.get('.success').should('contain', 'Order placed successfully');
        
        // Verify PDF download button appears
        cy.get('button').contains('Download Order Confirmation PDF').should('be.visible');
      });
  
      it('should update form progress bar correctly', () => {
        cy.visit('/orders/add');
        
        // Check initial progress
        cy.get('.progress-fill').invoke('attr', 'style').should('include', 'width: 0%');
        
        // Fill fields one by one and check progress
        cy.get('select[name="wasteType"]').select('CoconutHusk');
        cy.get('.progress-fill').invoke('attr', 'style').should('not.include', 'width: 0%');
        
        cy.get('input[name="quantity"]').type('10');
        cy.get('input[name="amount"]').type('500');
        cy.get('input[name="address"]').type('123 Test Street');
        cy.get('input[name="phoneNumber"]').type('1234567890');
        cy.get('input[name="email"]').type('test@example.com');
        
        // Check final progress is 100%
        cy.get('.progress-fill').invoke('attr', 'style').should('include', 'width: 100%');
      });
    });
  
    describe('Order Dashboard', () => {
      beforeEach(() => {
        // Create a test order via API
        cy.request('POST', 'http://localhost:5000/api/orders/', {
          wasteType: 'CoconutHusk',
          quantity: 10,
          amount: 500,
          address: 'Test Address',
          phoneNumber: '1234567890',
          email: 'dashboard-test@example.com'
        });
        
        // Visit the orders dashboard
        cy.visit('/orders');
      });
  
      it('should display the orders dashboard with correct elements', () => {
        cy.get('.dashboard-header h1').should('contain', 'Orders Dashboard');
        cy.get('.new-order-button').should('exist');
        cy.get('.stat-card').should('have.length', 4);
        cy.get('.orders-table').should('exist');
        cy.get('.pagination').should('exist');
      });
  
      it('should navigate to add order page when clicking New Order button', () => {
        cy.get('.new-order-button').click();
        cy.url().should('include', '/orders/add');
      });
  
      it('should filter orders based on search term', () => {
        // Search for our test order
        cy.get('.search-box input').type('dashboard-test@example.com');
        cy.wait(500); // Wait for filter to apply
        
        // Check that only matching orders are shown
        cy.get('.orders-table tbody tr').should('have.length', 1);
        cy.get('.orders-table tbody tr').first().should('contain', 'dashboard-test@example.com');
        
        // Clear search and verify more orders appear
        cy.get('.search-box input').clear();
        cy.wait(500); // Wait for filter to reset
        cy.get('.orders-table tbody tr').should('have.length.at.least', 1);
      });
  
      it('should sort orders when column header is clicked', () => {
        // Click on amount header to sort
        cy.get('th').contains('Amount').click();
        
        // Verify sort indicator appears
        cy.get('th').contains('Amount').should('have.attr', 'data-sort');
        
        // Click again for descending order
        cy.get('th').contains('Amount').click();
        cy.get('th').contains('Amount').should('have.attr', 'data-sort', 'desc');
      });
  
      it('should update order status', () => {
        // Find our test order
        cy.get('.search-box input').type('dashboard-test@example.com');
        cy.wait(500);
        
        // Stub window.prompt to return "Delivered"
        cy.window().then(win => {
          cy.stub(win, 'prompt').returns('Delivered');
        });
        
        // Click update button
        cy.get('.orders-table tbody tr').first().find('button.update').first().click();
        
        // Wait for alert
        cy.on('window:alert', (text) => {
          expect(text).to.contains('Order status updated successfully');
        });
        
        // Verify status is updated
        cy.get('.orders-table tbody tr').first().find('.status-badge').should('contain', 'Delivered');
      });
  
      it('should delete an order', () => {
        // Find our test order
        cy.get('.search-box input').type('dashboard-test@example.com');
        cy.wait(500);
        
        // Stub window.confirm to return true
        cy.window().then(win => {
          cy.stub(win, 'confirm').returns(true);
        });
        
        // Click delete button
        cy.get('.orders-table tbody tr').first().find('button.delete').click();
        
        // Wait for alert
        cy.on('window:alert', (text) => {
          expect(text).to.contains('Order deleted successfully');
        });
        
        // Verify order is deleted
        cy.get('.search-box input').clear().type('dashboard-test@example.com');
        cy.wait(500);
        cy.get('.orders-table tbody tr').should('not.exist');
      });
  
      it('should generate PDF for an order', () => {
        // Create a new order for PDF test
        cy.request('POST', 'http://localhost:5000/api/orders/', {
          wasteType: 'CoconutShell',
          quantity: 5,
          amount: 250,
          address: 'PDF Test Address',
          phoneNumber: '5556667777',
          email: 'pdf-test@example.com'
        });
        
        // Refresh the page
        cy.visit('/orders');
        
        // Find our PDF test order
        cy.get('.search-box input').type('pdf-test@example.com');
        cy.wait(500);
        
        // Stub PDF generation
        cy.window().then((win) => {
          cy.stub(win.document, 'createElement').callsFake((element) => {
            const el = win.document.createElement.wrappedMethod.call(win.document, element);
            if (element === 'a') {
              cy.stub(el, 'click');
            }
            return el;
          });
        });
        
        // Click PDF button
        cy.get('.orders-table tbody tr').first().contains('PDF').click();
        
        // We're verifying the PDF button was clicked and function was called
        // In a real test, you might want to check if a file was downloaded
      });
    });
  
    describe('Order API Tests', () => {
      it('should create a new order via API', () => {
        const newOrder = {
          wasteType: 'CoconutFiber',
          quantity: 15,
          amount: 750,
          address: 'API Test Address',
          phoneNumber: '5551234567',
          email: 'api-test@example.com'
        };
        
        cy.request('POST', 'http://localhost:5000/api/orders/', newOrder)
          .then((response) => {
            expect(response.status).to.eq(200);
            expect(response.body).to.have.property('_id');
            expect(response.body.wasteType).to.eq(newOrder.wasteType);
            expect(response.body.quantity).to.eq(newOrder.quantity);
            expect(response.body.amount).to.eq(newOrder.amount);
            expect(response.body.address).to.eq(newOrder.address);
            expect(response.body.phoneNumber).to.eq(newOrder.phoneNumber);
            expect(response.body.email).to.eq(newOrder.email);
            
            // Store the order ID for later tests
            const orderId = response.body._id;
            
            // Test GET by ID
            cy.request('GET', `http://localhost:5000/api/orders/${orderId}`)
              .then((getResponse) => {
                expect(getResponse.status).to.eq(200);
                expect(getResponse.body).to.have.property('_id', orderId);
              });
            
            // Test UPDATE
            cy.request('PUT', `http://localhost:5000/api/orders/${orderId}`, {
              status: 'Delivered',
              quantity: 20
            }).then((updateResponse) => {
              expect(updateResponse.status).to.eq(200);
              expect(updateResponse.body.status).to.eq('Delivered');
              expect(updateResponse.body.quantity).to.eq(20);
            });
            
            // Test DELETE
            cy.request('DELETE', `http://localhost:5000/api/orders/${orderId}`)
              .then((deleteResponse) => {
                expect(deleteResponse.status).to.eq(200);
                expect(deleteResponse.body).to.have.property('message');
              });
          });
      });
  
      it('should get all orders via API', () => {
        cy.request('GET', 'http://localhost:5000/api/orders/')
          .then((response) => {
            expect(response.status).to.eq(200);
            expect(response.body).to.be.an('array');
          });
      });
      
      it('should handle validation errors correctly', () => {
        const invalidOrder = {
          // Missing required fields
          wasteType: 'CoconutHusk',
          // No quantity
          // No amount
          address: 'Invalid Test',
          // No phone
          email: 'invalid@example.com'
        };
        
        cy.request({
          method: 'POST',
          url: 'http://localhost:5000/api/orders/',
          body: invalidOrder,
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(400);
          // Check that we get validation error message
          expect(response.body).to.have.property('message');
        });
      });
    });
  });