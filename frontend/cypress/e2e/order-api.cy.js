// cypress/e2e/order-api.cy.js

describe('Order API Endpoints', () => {
    // Test order data
    const testOrder = {
      wasteType: 'CoconutHusk',
      quantity: 15,
      amount: 750,
      address: 'API Test Suite Address',
      phoneNumber: '9876543210',
      email: 'apitest@example.com'
    };
  
    let orderId;
  
    before(() => {
      // Clean up any existing test orders before running tests
      cy.cleanupOrders();
    });
  
    after(() => {
      // Clean up test orders after tests
      cy.cleanupOrders();
    });
  
    it('should create a new order', () => {
      cy.request('POST', `${Cypress.env('apiUrl')}/orders`, testOrder)
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property('_id');
          orderId = response.body._id;
  
          // Verify the order was created with correct data
          expect(response.body.wasteType).to.eq(testOrder.wasteType);
          expect(response.body.quantity).to.eq(testOrder.quantity);
          expect(response.body.amount).to.eq(testOrder.amount);
          expect(response.body.address).to.eq(testOrder.address);
          expect(response.body.phoneNumber).to.eq(testOrder.phoneNumber);
          expect(response.body.email).to.eq(testOrder.email);
          
          // Check default status
          expect(response.body.status).to.eq('Pending');
        });
    });
  
    it('should return validation error for invalid order data', () => {
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
        url: `${Cypress.env('apiUrl')}/orders`,
        body: invalidOrder,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        // Check that we get validation error messages
        expect(response.body).to.have.property('message');
      });
    });
  
    it('should get all orders', () => {
      cy.request('GET', `${Cypress.env('apiUrl')}/orders`)
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.be.an('array');
          
          // Verify our created order is in the list
          const found = response.body.some(order => order._id === orderId);
          expect(found).to.be.true;
        });
    });
  
    it('should get a specific order by ID', () => {
      cy.request('GET', `${Cypress.env('apiUrl')}/orders/${orderId}`)
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property('_id', orderId);
          expect(response.body).to.deep.include(testOrder);
        });
    });
  
    it('should return 404 for non-existent order ID', () => {
      const nonExistentId = '60f5e5b5c6e5e1001c8f1234'; // Fake MongoDB ID
      
      cy.request({
        method: 'GET',
        url: `${Cypress.env('apiUrl')}/orders/${nonExistentId}`,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(404);
      });
    });
  
    it('should update an order', () => {
      const updates = {
        quantity: 20,
        amount: 1000,
        status: 'On Delivery'
      };
      
      cy.request('PUT', `${Cypress.env('apiUrl')}/orders/${orderId}`, updates)
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property('_id', orderId);
          
          // Verify updated fields
          expect(response.body.quantity).to.eq(updates.quantity);
          expect(response.body.amount).to.eq(updates.amount);
          expect(response.body.status).to.eq(updates.status);
          
          // Verify unchanged fields
          expect(response.body.wasteType).to.eq(testOrder.wasteType);
          expect(response.body.address).to.eq(testOrder.address);
          expect(response.body.email).to.eq(testOrder.email);
        });
    });
  
    it('should delete an order', () => {
      cy.request('DELETE', `${Cypress.env('apiUrl')}/orders/${orderId}`)
        .then((response) => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property('message');
          expect(response.body.message).to.include('deleted');
          
          // Verify the order is actually deleted by trying to fetch it
          cy.request({
            method: 'GET',
            url: `${Cypress.env('apiUrl')}/orders/${orderId}`,
            failOnStatusCode: false
          }).then((getResponse) => {
            expect(getResponse.status).to.eq(404);
          });
        });
    });
  
    it('should handle concurrent API requests properly', () => {
      // Create multiple orders concurrently
      const orderPromises = [];
      
      for (let i = 0; i < 5; i++) {
        const order = {
          ...testOrder,
          email: `concurrent${i}@example.com`,
          quantity: 5 + i,
          amount: 100 * (i + 1)
        };
        
        orderPromises.push(
          cy.request('POST', `${Cypress.env('apiUrl')}/orders`, order)
        );
      }
      
      // Wait for all requests to complete
      cy.wrap(Promise.all(orderPromises)).then((responses) => {
        // Verify all orders were created successfully
        responses.forEach(response => {
          expect(response.status).to.eq(200);
          expect(response.body).to.have.property('_id');
        });
        
        // Get all orders and verify our concurrent orders exist
        cy.request('GET', `${Cypress.env('apiUrl')}/orders`)
          .then((getResponse) => {
            expect(getResponse.status).to.eq(200);
            expect(getResponse.body).to.be.an('array');
            
            // Check that our 5 concurrent orders exist
            for (let i = 0; i < 5; i++) {
              const email = `concurrent${i}@example.com`;
              const found = getResponse.body.some(order => order.email === email);
              expect(found).to.be.true;
            }
          });
      });
    });
  
    it('should handle order status transitions correctly', () => {
      // Create a new order for testing status transitions
      cy.request('POST', `${Cypress.env('apiUrl')}/orders`, testOrder)
        .then((response) => {
          expect(response.status).to.eq(200);
          const newOrderId = response.body._id;
          
          // Verify initial status is 'Pending'
          expect(response.body.status).to.eq('Pending');
          
          // Update to 'On Delivery'
          cy.request('PUT', `${Cypress.env('apiUrl')}/orders/${newOrderId}`, {
            status: 'On Delivery'
          }).then((updateResponse1) => {
            expect(updateResponse1.status).to.eq(200);
            expect(updateResponse1.body.status).to.eq('On Delivery');
            
            // Update to 'Delivered'
            cy.request('PUT', `${Cypress.env('apiUrl')}/orders/${newOrderId}`, {
              status: 'Delivered'
            }).then((updateResponse2) => {
              expect(updateResponse2.status).to.eq(200);
              expect(updateResponse2.body.status).to.eq('Delivered');
              
              // Clean up by deleting this test order
              cy.request('DELETE', `${Cypress.env('apiUrl')}/orders/${newOrderId}`);
            });
          });
        });
    });
  
    it('should properly validate email format', () => {
      const invalidEmailOrder = {
        ...testOrder,
        email: 'not-an-email'
      };
      
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/orders`,
        body: invalidEmailOrder,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.include('email');
      });
    });
  
    it('should properly validate phone number format', () => {
      const invalidPhoneOrder = {
        ...testOrder,
        phoneNumber: '123'  // Too short
      };
      
      cy.request({
        method: 'POST',
        url: `${Cypress.env('apiUrl')}/orders`,
        body: invalidPhoneOrder,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(400);
        expect(response.body).to.have.property('message');
        expect(response.body.message).to.include('phone');
      });
    });
  });