// cypress/e2e/order-management-integration.cy.js

describe('Order Management Integration Tests', () => {
    // We'll use this email to identify our test orders
    const testEmail = `test-${Date.now()}@example.com`;
    
    beforeEach(() => {
      // Login before each test
      cy.login('vihinsa2@gmail.com', '0714397766');
    });
    
    after(() => {
      // Clean up all test orders after tests are complete
      cy.cleanupOrders();
    });
    
    it('should create, view, update and delete an order in a complete workflow', () => {
      // 1. Create a new order
      cy.visit('/orders/add');
      
      // Generate unique test data
      const uniqueEmail = `complete-flow-${Date.now()}@example.com`;
      
      // Fill in the order form
      cy.fillOrderForm({
        wasteType: 'CoconutShell',
        quantity: '25',
        amount: '1250',
        address: '456 Integration Test Blvd',
        phoneNumber: '7778889999',
        email: uniqueEmail
      });
      
      // Intercept the POST request
      cy.intercept('POST', 'http://localhost:5000/api/orders/').as('createOrder');
      
      // Submit the form
      cy.get('button[type="submit"]').click();
      
      // Wait for the request and check response
      cy.wait('@createOrder').then((interception) => {
        expect(interception.response.statusCode).to.equal(200);
        const createdOrder = interception.response.body;
        expect(createdOrder).to.have.property('_id');
        
        // 2. Verify the order appears in the orders dashboard
        cy.visit('/orders');
        cy.waitForOrders();
        
        // Search for our specific order
        cy.get('.search-box input').type(uniqueEmail);
        cy.wait(500); // Allow time for filter to apply
        
        // Verify our order is found and displayed correctly
        cy.get('.orders-table tbody tr').should('have.length', 1);
        cy.get('.orders-table tbody tr').first().within(() => {
          cy.get('td').eq(0).should('contain', 'CoconutShell');
          cy.get('td').eq(1).should('contain', '25');
          cy.get('td').eq(2).should('contain', '1,250');
          cy.get('td').eq(4).should('contain', '7778889999');
          cy.get('td').eq(5).should('contain', uniqueEmail);
          cy.get('td').eq(6).should('contain', 'Pending');
          
          // 3. Update the order status
          // Stub the prompt
          cy.window().then(win => {
            cy.stub(win, 'prompt').returns('Delivered');
          });
          
          // Click update button
          cy.get('button.update').first().click();
        });
        
        // Verify the status was updated
        cy.get('.orders-table tbody tr').first().find('td').eq(6).should('contain', 'Delivered');
        
        // 4. Delete the order
        // Stub the confirm dialog
        cy.window().then(win => {
          cy.stub(win, 'confirm').returns(true);
        });
        
        // Click delete button
        cy.get('.orders-table tbody tr').first().find('button.delete').click();
        
        // Verify the order is removed
        cy.get('.search-box input').clear();
        cy.wait(500);
        cy.get('.search-box input').type(uniqueEmail);
        cy.wait(500);
        cy.get('.orders-table tbody tr').should('not.exist');
      });
    });
    
    it('should update chart data when new orders are added', () => {
      // Create multiple orders with different statuses to change chart data
      const statuses = ['Pending', 'On Delivery', 'Delivered', 'Cancelled'];
      const orderPromises = [];
      
      // Create 4 orders with different statuses
      for (let i = 0; i < 4; i++) {
        const orderData = {
          wasteType: 'CoconutHusk',
          quantity: 5,
          amount: 250,
          address: 'Chart Test Address',
          phoneNumber: '1234567890',
          email: `chart-test-${i}@example.com`,
          status: statuses[i]
        };
        
        orderPromises.push(
          cy.request('POST', 'http://localhost:5000/api/orders/', orderData)
        );
      }
      
      // Wait for all orders to be created
      cy.wrap(Promise.all(orderPromises)).then(() => {
        // Visit the orders dashboard
        cy.visit('/orders');
        cy.waitForOrders();
        
        // Check that the chart contains data for all status types
        cy.get('.status-item').should('have.length', 4);
        
        // Verify each status has at least one order
        cy.get('.status-item').each(($statusItem, index) => {
          cy.wrap($statusItem).find('span').eq(1).invoke('text').then((text) => {
            // Extract the count from text like "New Orders: 3"
            const count = parseInt(text.split(':')[1].trim(), 10);
            expect(count).to.be.at.least(1);
          });
        });
        
        // Now create a new order and verify chart updates
        cy.visit('/orders/add');
        cy.fillOrderForm({
          wasteType: 'CoconutFiber',
          quantity: '10',
          amount: '500',
          address: 'Chart Update Test',
          phoneNumber: '5556667777',
          email: `chart-update-${Date.now()}@example.com`
        });
        
        // Submit the form
        cy.get('button[type="submit"]').click();
        
        // Wait for success message
        cy.get('.success').should('be.visible');
        
        // Once redirected back to orders page
        cy.url().should('include', '/orders');
        cy.waitForOrders();
        
        // Verify the "New Orders" count has increased
        cy.get('.status-item').eq(0).find('span').eq(1).invoke('text').then((text) => {
          const count = parseInt(text.split(':')[1].trim(), 10);
          expect(count).to.be.at.least(2); // At least 2 new orders (1 from beforeEach + 1 just created)
        });
      });
    });
    
    it('should show correct order stats', () => {
      // Create a batch of test orders with known values to test stats calculation
      const orderPromises = [];
      let totalQuantity = 0;
      let totalAmount = 0;
      
      // Create 5 orders with different amounts and quantities
      for (let i = 1; i <= 5; i++) {
        const quantity = i * 10;
        const amount = i * 100;
        totalQuantity += quantity;
        totalAmount += amount;
        
        const orderData = {
          wasteType: 'CoconutHusk',
          quantity: quantity,
          amount: amount,
          address: 'Stats Test Address',
          phoneNumber: '1234567890',
          email: `stats-test-${i}@example.com`
        };
        
        orderPromises.push(
          cy.request('POST', 'http://localhost:5000/api/orders/', orderData)
        );
      }
      
      // Wait for all orders to be created
      cy.wrap(Promise.all(orderPromises)).then(() => {
        // Visit the orders dashboard
        cy.visit('/orders');
        cy.waitForOrders();
        
        // Check total orders stat (should be at least 5 from what we just created)
        cy.get('.stat-card').eq(0).find('.stat-value').should('contain', '5');
        
        // Check total amount
        cy.get('.stat-card').eq(1).find('.stat-value').invoke('text').then((text) => {
          // Remove non-numeric characters (like "Rs. " and commas)
          const amount = parseFloat(text.replace(/[^0-9.-]+/g, ''));
          expect(amount).to.be.at.least(totalAmount);
        });
        
        // Check average order value
        cy.get('.stat-card').eq(2).find('.stat-value').invoke('text').then((text) => {
          const avgValue = parseFloat(text.replace(/[^0-9.-]+/g, ''));
          const expectedAvg = totalAmount / 5;
          // Allow for some rounding differences
          expect(avgValue).to.be.closeTo(expectedAvg, 0.1);
        });
        
        // Check total quantity
        cy.get('.stat-card').eq(3).find('.stat-value').invoke('text').then((text) => {
          const quantity = parseInt(text, 10);
          expect(quantity).to.be.at.least(totalQuantity);
        });
      });
    });
    
    it('should highlight errors for invalid form submissions', () => {
      cy.visit('/orders/add');
      
      // Try to submit an empty form
      cy.get('button[type="submit"]').click();
      
      // Check that error messages are shown for all required fields
      cy.get('.form-error').should('have.length.at.least', 6);
      
      // Check specific error messages
      cy.get('.form-error').eq(0).should('contain', 'required');
      
      // Fill in one field and check that its error disappears
      cy.get('select[name="wasteType"]').select('CoconutHusk');
      cy.get('.form-error').should('have.length.at.least', 5);
      
      // Form should not submit with partial data
      cy.get('button[type="submit"]').click();
      cy.url().should('include', '/orders/add');
      
      // Fill in remaining fields with invalid data
      cy.get('input[name="quantity"]').type('-10');
      cy.get('input[name="amount"]').type('-500');
      cy.get('input[name="address"]').type('Test Address');
      cy.get('input[name="phoneNumber"]').type('123'); // Too short
      cy.get('input[name="email"]').type('invalid-email'); // Invalid format
      
      // Submit again
      cy.get('button[type="submit"]').click();
      
      // Check that validation errors are shown for invalid inputs
      cy.get('.form-error').should('have.length.at.least', 3);
      cy.get('.form-error').eq(0).should('contain', 'positive');
      cy.get('.form-error').eq(1).should('contain', 'positive');
      cy.get('.form-error').eq(2).should('contain', 'digits');
      cy.get('.form-error').eq(3).should('contain', 'invalid');
      
      // Fix the validation errors
      cy.get('input[name="quantity"]').clear().type('10');
      cy.get('input[name="amount"]').clear().type('500');
      cy.get('input[name="phoneNumber"]').clear().type('1234567890');
      cy.get('input[name="email"]').clear().type('valid@example.com');
      
      // Verify no error messages
      cy.get('.form-error').should('not.exist');
      
      // Form should submit successfully now
      cy.get('button[type="submit"]').click();
      cy.get('.success').should('be.visible');
    });
  });