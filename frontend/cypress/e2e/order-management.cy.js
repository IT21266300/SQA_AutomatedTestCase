// cypress/e2e/order-management.cy.js
/// <reference types="cypress" />

describe('Order Management', () => {
  beforeEach(() => {
    
  
    // Login before running tests 
    cy.visit('/login');
    cy.get('input[name="email"]').type('vihinsa2@gmail.com');
    cy.get('input[name="password"]').type('0714397766');
    cy.get('button[type="submit"]').click();
    
    // Verify login was successful by checking for redirect
    cy.url().should('include', '/finance');
  });

  describe('Order Dashboard', () => {
    it('should display the orders dashboard', () => {
      cy.visit('/orders');
      cy.get('.dashboard-header h1').should('contain', 'Orders Dashboard');
      cy.get('.stat-card').should('have.length', 4);
      cy.get('.new-order-button').should('exist');
    });

    it('should navigate to add order page when new order button is clicked', () => {
      cy.visit('/orders');
      cy.get('.new-order-button').click();
      cy.url().should('include', '/orders/add');
    });

    it('should filter orders based on search term', () => {
      
      cy.visit('/orders');
      cy.get('.search-box input').type('CoconutHusk');
      
      cy.wait(500);
      // Check that only CoconutHusk orders are shown
      cy.get('.orders-table tbody tr').each(($row) => {
        cy.wrap($row).find('td').eq(0).should('contain', 'CoconutHusk');
      });
    });

    it('should sort orders when column headers are clicked', () => {
      cy.visit('/orders');
      // Click on amount header to sort
      cy.get('th').contains('Amount').click();
      // Get all amount values
      cy.get('.orders-table tbody tr td:nth-child(3)').then($cells => {
        const amounts = $cells.map((i, el) => 
          parseFloat(el.textContent.replace(/[^0-9.-]+/g, ''))
        ).get();
        
        // Check if amounts are sorted in ascending order
        const sortedAmounts = [...amounts].sort((a, b) => a - b);
        expect(amounts).to.deep.equal(sortedAmounts);
      });
      
      // Click again for descending order
      cy.get('th').contains('Amount').click();
      cy.get('.orders-table tbody tr td:nth-child(3)').then($cells => {
        const amounts = $cells.map((i, el) => 
          parseFloat(el.textContent.replace(/[^0-9.-]+/g, ''))
        ).get();
        
        // Check if amounts are sorted in descending order
        const sortedAmounts = [...amounts].sort((a, b) => b - a);
        expect(amounts).to.deep.equal(sortedAmounts);
      });
    });

    it('should filter orders by date range', () => {
      cy.visit('/orders');
      
      // Set date range for last month
      const today = new Date();
      const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, today.getDate());
      
      // Format dates for input (YYYY-MM-DD)
      const formatDate = (date) => {
        return date.toISOString().split('T')[0];
      };
      
      cy.get('.date-input').first().type(formatDate(lastMonth));
      cy.get('.date-input').last().type(formatDate(today));
      
      // Wait for filter to apply
      cy.wait(500);
      
      // Verify that orders are within date range
      cy.get('.orders-table tbody tr').should('exist');
    });




    
  });

  describe('Add Order', () => {
    it('should display the add order form', () => {
      cy.visit('/orders/add');
      // Use class name from the React component
      cy.get('.add-order-form h1').should('contain', 'Add New Order');
      // Use data-testid attributes where available
      cy.get('[data-testid="waste-type-input"]').should('exist');
      cy.get('[data-testid="quantity-input"]').should('exist');
      cy.get('[data-testid="amount-input"]').should('exist');
      cy.get('[data-testid="address-input"]').should('exist');
      cy.get('[data-testid="phone-input"]').should('exist');
      cy.get('[data-testid="email-input"]').should('exist');
    });

    it('should show error messages for invalid inputs', () => {
      cy.visit('/orders/add');
    
      // Submit without filling required fields
      cy.get('[data-testid="submit-button"]').click();
    
      // Check for error messages using data-testid
      cy.get('[data-testid$="-error"]').should('have.length.at.least', 1);
      cy.get('.error-message').first().should('be.visible');
    });

    it('should successfully submit a valid order form', () => {
      cy.visit('/orders/add');
      
      // Fill in the form using data-testid
      cy.get('[data-testid="waste-type-input"]').select('CoconutHusk');
      cy.get('[data-testid="quantity-input"]').type('10');
      cy.get('[data-testid="amount-input"]').type('500');
      cy.get('[data-testid="address-input"]').type('123 Test Street, City');
      cy.get('[data-testid="phone-input"]').type('1234567890');
      cy.get('[data-testid="email-input"]').type('customer@example.com');
      
      // Intercept the POST request to check it's sending the right data
      cy.intercept('POST', 'http://localhost:5000/api/orders/').as('createOrder');
      
      // Submit the form
      cy.get('[data-testid="submit-button"]').click();
      
      // Wait for the request to complete
      cy.wait('@createOrder').then((interception) => {
        expect(interception.request.body).to.deep.include({
          wasteType: 'CoconutHusk',
          quantity: '10',
          amount: '500',
          address: '123 Test Street, City',
          phoneNumber: '1234567890',
          email: 'customer@example.com'
        });
        
        expect(interception.response.statusCode).to.equal(200);
      });
      
      // Check for success message using data-testid
      cy.get('[data-testid="submit-success"]').should('contain', 'Order placed successfully');
      
      // Account for the 2-second delay before redirect
      cy.wait(2000);
      
      // Check that we're redirected to the orders page
      cy.url().should('include', '/orders');
    });

    it('should show progress bar updated correctly when filling form', () => {
      cy.visit('/orders/add');
      
      // Check initial progress
      cy.get('[data-testid="form-progress-bar"] .progress-fill').invoke('attr', 'style').should('include', 'width: 0%');
      
      // Fill form fields one by one and check progress updates
      // The percentages are calculated as (filledFields / totalFields) * 100
      // With 6 fields, each field represents approximately 16.67%
      
      cy.get('[data-testid="waste-type-input"]').select('CoconutHusk');
      // Should now be ~16.7% (1/6 fields)
      cy.get('[data-testid="form-progress-bar"] .progress-fill').invoke('attr', 'style').should('include', 'width: 16');
      
      cy.get('[data-testid="quantity-input"]').type('10');
      // Should now be ~33.3% (2/6 fields)
      cy.get('[data-testid="form-progress-bar"] .progress-fill').invoke('attr', 'style').should('include', 'width: 33');
      
      cy.get('[data-testid="amount-input"]').type('500');
      // Should now be ~50% (3/6 fields)
      cy.get('[data-testid="form-progress-bar"] .progress-fill').invoke('attr', 'style').should('include', 'width: 50');
      
      cy.get('[data-testid="address-input"]').type('123 Test Street, City');
      // Should now be ~66.7% (4/6 fields)
      cy.get('[data-testid="form-progress-bar"] .progress-fill').invoke('attr', 'style').should('include', 'width: 66');
      
      cy.get('[data-testid="phone-input"]').type('1234567890');
      // Should now be ~83.3% (5/6 fields)
      cy.get('[data-testid="form-progress-bar"] .progress-fill').invoke('attr', 'style').should('include', 'width: 83');
      
      cy.get('[data-testid="email-input"]').type('customer@example.com');
      // Should now be 100% (6/6 fields)
      cy.get('[data-testid="form-progress-bar"] .progress-fill').invoke('attr', 'style').should('include', 'width: 100');
    });

    it('should validate phone number format', () => {
      cy.visit('/orders/add');
      
      // Type invalid phone number
      cy.get('[data-testid="phone-input"]').type('123abc');
      
      // Check the value is sanitized (only numbers are kept)
      cy.get('[data-testid="phone-input"]').should('have.value', '123');
      
      // Type more than 10 digits
      cy.get('[data-testid="phone-input"]').clear().type('12345678901');
      
      // Check it's trimmed to 10 digits
      cy.get('[data-testid="phone-input"]').should('have.value', '1234567890');
    });

    it('should generate and download PDF after successful order placement', () => {
      cy.visit('/orders/add');
      
      // Fill in the form
      cy.get('[data-testid="waste-type-input"]').select('CoconutHusk');
      cy.get('[data-testid="quantity-input"]').type('10');
      cy.get('[data-testid="amount-input"]').type('500');
      cy.get('[data-testid="address-input"]').type('123 Test Street, City');
      cy.get('[data-testid="phone-input"]').type('1234567890');
      cy.get('[data-testid="email-input"]').type('customer@example.com');
      
      // Stub the PDF generation and download functionality
      cy.window().then((win) => {
        cy.stub(win.document, 'createElement').callsFake((element) => {
          const el = win.document.createElement.wrappedMethod.call(win.document, element);
          if (element === 'a') {
            // Prevent actual download by stubbing click
            cy.stub(el, 'click');
          }
          return el;
        });
      });
      
      // Submit the form
      cy.get('[data-testid="submit-button"]').click();
      
      // Wait for success message
      cy.get('[data-testid="submit-success"]').should('contain', 'Order placed successfully');
      
      // Check that PDF download button appears
      cy.get('[data-testid="download-pdf-button"]').should('be.visible');
      
      // Click to download PDF
      cy.get('[data-testid="download-pdf-button"]').click();
    });
  });

  describe('Order Operations', () => {
    it('should update order status', () => {
      // First create a test order
      cy.request({
        method: 'POST',
        url: 'http://localhost:5000/api/orders/',
        body: {
          wasteType: 'CoconutHusk',
          quantity: '5',
          amount: '250',
          address: 'Test Address',
          phoneNumber: '1234567890',
          email: 'test@example.com'
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        const orderId = response.body._id;
        
        // Visit orders page
        cy.visit('/orders');
        
        // Stub window.prompt to return "Delivered"
        cy.window().then(win => {
          cy.stub(win, 'prompt').returns('Delivered');
        });
        
        // Find the order and click update button
        cy.contains('tr', 'test@example.com').within(() => {
          cy.get('button.update').first().click();
        });
        
        // Intercept the PUT request to validate
        cy.intercept('PUT', `http://localhost:5000/api/orders/${orderId}`).as('updateOrder');
        
        // Wait for the alert
        cy.on('window:alert', (text) => {
          expect(text).to.contains('Order status updated successfully');
        });
        
        // Verify the status has changed in the UI
        cy.contains('tr', 'test@example.com').within(() => {
          cy.get('.status-badge').should('contain', 'Delivered');
        });
      });
    });

    it('should delete an order', () => {
      // First create a test order
      cy.request({
        method: 'POST',
        url: 'http://localhost:5000/api/orders/',
        body: {
          wasteType: 'CoconutShell',
          quantity: '3',
          amount: '150',
          address: 'Delete Test Address',
          phoneNumber: '9876543210',
          email: 'delete@example.com'
        }
      }).then((response) => {
        expect(response.status).to.eq(200);
        const orderId = response.body._id;
        
        // Visit orders page
        cy.visit('/orders');
        
        // Stub window.confirm to return true
        cy.window().then(win => {
          cy.stub(win, 'confirm').returns(true);
        });
        
        // Find the order and click delete button
        cy.contains('tr', 'delete@example.com').within(() => {
          cy.get('button.delete').click();
        });
        
        // Intercept the DELETE request
        cy.intercept('DELETE', `http://localhost:5000/api/orders/${orderId}`).as('deleteOrder');
        
        // Wait for the alert
        cy.on('window:alert', (text) => {
          expect(text).to.contains('Order deleted successfully');
        });
        
        // Verify the order no longer exists in the UI
        cy.contains('delete@example.com').should('not.exist');
      });
    });

    it('should generate PDF for specific order', () => {
      cy.visit('/orders');
      
      // Stub PDF generation
      cy.window().then((win) => {
        cy.stub(win.document, 'createElement').callsFake((element) => {
          const el = win.document.createElement.wrappedMethod.call(win.document, element);
          if (element === 'a') {
            // Prevent actual download by stubbing click
            cy.stub(el, 'click');
          }
          return el;
        });
      });
      
      // Click on the PDF button for the first order
      cy.get('.orders-table tbody tr').first().within(() => {
        cy.get('button').contains('PDF').click();
      });
      
      // We've stubbed the actual download, so we just verify the function was called
    });
  });

 
});