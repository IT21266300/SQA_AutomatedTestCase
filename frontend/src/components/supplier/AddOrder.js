import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faRecycle, 
  faInfoCircle, 
  faShoppingCart, 
  faMapMarkerAlt, 
  faPhone, 
  faEnvelope, 
  faMoneyBillWave,
  faFileDownload,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import MainNavbar from '../Home/MainNavbar';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Create a custom event for order updates
export const ORDER_PLACED_EVENT = 'orderPlaced';

const AddOrder = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    wasteType: '',
    quantity: '',
    amount: '',
    address: '',
    phoneNumber: '',
    email: ''
  });
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formProgress, setFormProgress] = useState(0);

  // Calculate form completion progress
  useEffect(() => {
    const requiredFields = ['wasteType', 'quantity', 'amount', 'address', 'phoneNumber', 'email'];
    const filledFieldsCount = requiredFields.filter(field => formData[field] !== '').length;
    const progress = Math.floor((filledFieldsCount / requiredFields.length) * 100);
    setFormProgress(progress);
  }, [formData]);

  const validateForm = () => {
    const newErrors = {};

    if (!formData.wasteType) {
      newErrors.wasteType = 'Waste Type is required';
    }

    if (!formData.quantity) {
      newErrors.quantity = 'Quantity is required';
    } else if (parseFloat(formData.quantity) <= 0) {
      newErrors.quantity = 'Quantity must be a positive number';
    }

    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    }

    if (!formData.address) {
      newErrors.address = 'Address is required';
    }

    if (!formData.phoneNumber) {
      newErrors.phoneNumber = 'Phone Number is required';
    } else if (!/^\d{10}$/.test(formData.phoneNumber)) {
      newErrors.phoneNumber = 'Phone Number must be 10 digits';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    let newValue = value;
    
    if (name === 'quantity' || name === 'amount') {
      // Only allow numbers and a single decimal point
      newValue = value.replace(/[^0-9.]/g, '');
      newValue = newValue.replace(/(\..*)\./g, '$1');
    } else if (name === 'phoneNumber') {
      // Only allow numbers, max 10 digits
      newValue = value.replace(/[^0-9]/g, '').slice(0, 10);
    }
    
    setFormData({ ...formData, [name]: newValue });
    
    // Clear error for this field if it exists
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    setSuccess('');

    if (!validateForm()) {
      // Scroll to the first error
      const firstErrorField = Object.keys(errors)[0];
      if (firstErrorField) {
        document.getElementById(firstErrorField)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await axios.post('http://localhost:5000/api/orders/', formData);
      console.log('Order placed successfully:', response.data);
      setSuccess('Order placed successfully!');
      
      // Dispatch custom event when order is placed successfully
      const orderPlacedEvent = new CustomEvent(ORDER_PLACED_EVENT, {
        detail: response.data
      });
      window.dispatchEvent(orderPlacedEvent);

      // Reset form
      setFormData({
        wasteType: '',
        quantity: '',
        amount: '',
        address: '',
        phoneNumber: '',
        email: ''
      });
      
      // Navigate after a short delay
      setTimeout(() => navigate('/orders'), 2000);
    } catch (error) {
      console.error('Error placing order:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to place order. Please try again.';
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateOrderPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Add title with styling
      doc.setFontSize(22);
      doc.setTextColor(14, 116, 144);
      doc.text('Order Confirmation', 105, 20, { align: 'center' });
      
      // Add divider line
      doc.setDrawColor(14, 116, 144);
      doc.setLineWidth(0.5);
      doc.line(14, 25, 196, 25);
      
      // Order details
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text('Order Details', 14, 35);
      
      // Create a styled table for order details
      const tableData = [
        ['Waste Type', formData.wasteType],
        ['Quantity', formData.quantity],
        ['Amount', `Rs. ${formData.amount}`],
        ['Address', formData.address],
        ['Phone Number', formData.phoneNumber],
        ['Email', formData.email],
        ['Date', new Date().toLocaleDateString()],
        ['Time', new Date().toLocaleTimeString()]
      ];
      
      doc.autoTable({
        startY: 40,
        head: [['Field', 'Value']],
        body: tableData,
        theme: 'grid',
        headStyles: { 
          fillColor: [14, 116, 144],
          textColor: [255, 255, 255],
          fontStyle: 'bold'
        },
        alternateRowStyles: {
          fillColor: [240, 249, 255]
        },
        styles: {
          fontSize: 10,
          cellPadding: 6
        }
      });
      
      // Footer
      const pageCount = doc.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(10);
        doc.setTextColor(128, 128, 128);
        doc.text('Thank you for your order! If you have any questions, please contact customer support.', 105, 285, { align: 'center' });
      }
  
      doc.save('order-confirmation.pdf');
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <div className="add-order-wrapper">
      <MainNavbar />
      <div className="add-order-container">
        <div className="form-container">
          <div className="back-link" onClick={() => navigate('/orders')} data-testid="back-to-orders">
            <FontAwesomeIcon icon={faArrowLeft} /> Back to Orders
          </div>
          
          <form className="add-order-form" onSubmit={handleOrderSubmit} data-testid="order-form">
            <h1>Add New Order</h1>

            {/* Progress Bar */}
            <div className="progress-container">
              <div className="progress-bar" data-testid="form-progress-bar">
                <div className="progress-fill" style={{ width: `${formProgress}%` }}></div>
              </div>
              <span className="progress-text">{formProgress}% completed</span>
            </div>

            {/* Alerts */}
            {errors.submit && (
              <div className="alert error-alert" data-testid="submit-error">
                <FontAwesomeIcon icon={faInfoCircle} /> {errors.submit}
              </div>
            )}
            
            {success && (
              <div className="alert success-alert" data-testid="submit-success">
                <FontAwesomeIcon icon={faInfoCircle} /> {success}
              </div>
            )}
            
            {success && (
              <button
                type="button"
                className="pdf-button"
                onClick={generateOrderPDF}
                data-testid="download-pdf-button"
              >
                <FontAwesomeIcon icon={faFileDownload} /> Download Order Confirmation
              </button>
            )}

            {/* Order Details Section */}
            <div className="form-section">
              <h2 className="section-title">Order Details</h2>
              
              <div className="form-group">
                <label htmlFor="wasteType" className="form-label">
                  <FontAwesomeIcon icon={faRecycle} className="label-icon" />
                  Waste Type
                  <span className="required-indicator">*</span>
                </label>
                <div className="input-wrapper">
                  <select
                    id="wasteType"
                    name="wasteType"
                    className={`form-input ${errors.wasteType ? 'error-input' : ''}`}
                    value={formData.wasteType}
                    onChange={handleInputChange}
                    required
                    data-testid="waste-type-input"
                  >
                    <option value="">Select Waste Type</option>
                    <option value="CoconutHusk">Coconut Husk</option>
                    <option value="CoconutShell">Coconut Shell</option>
                    <option value="CoconutFiber">Coconut Fiber</option>
                    <option value="CoconutPith">Coconut Pith</option>
                    <option value="CoconutLeaves">Coconut Leaves</option>
                    <option value="CoconutTrunk">Coconut Trunk</option>
                  </select>
                  <div className="tooltip" data-testid="waste-type-tooltip">
                    <FontAwesomeIcon icon={faInfoCircle} />
                    <span className="tooltip-text">Select the type of coconut waste product to order.</span>
                  </div>
                </div>
                {errors.wasteType && <div className="error-message" data-testid="waste-type-error">{errors.wasteType}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="quantity" className="form-label">
                  <FontAwesomeIcon icon={faShoppingCart} className="label-icon" />
                  Quantity
                  <span className="required-indicator">*</span>
                </label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    id="quantity"
                    name="quantity"
                    className={`form-input ${errors.quantity ? 'error-input' : ''}`}
                    value={formData.quantity}
                    onChange={handleInputChange}
                    required
                    min="1"
                    data-testid="quantity-input"
                  />
                  <div className="tooltip" data-testid="quantity-tooltip">
                    <FontAwesomeIcon icon={faInfoCircle} />
                    <span className="tooltip-text">Enter the number of units to order (must be positive).</span>
                  </div>
                </div>
                <div className="input-hint">How many units do you want to order?</div>
                {errors.quantity && <div className="error-message" data-testid="quantity-error">{errors.quantity}</div>}
              </div>
            </div>

            {/* Payment & Contact Section */}
            <div className="form-section">
              <h2 className="section-title">Payment & Contact Information</h2>
              
              <div className="form-group">
                <label htmlFor="amount" className="form-label">
                  <FontAwesomeIcon icon={faMoneyBillWave} className="label-icon" />
                  Amount (Rs.)
                  <span className="required-indicator">*</span>
                </label>
                <div className="input-wrapper">
                  <input
                    type="number"
                    id="amount"
                    name="amount"
                    className={`form-input ${errors.amount ? 'error-input' : ''}`}
                    value={formData.amount}
                    onChange={handleInputChange}
                    required
                    min="0"
                    step="0.01"
                    data-testid="amount-input"
                  />
                  <div className="tooltip" data-testid="amount-tooltip">
                    <FontAwesomeIcon icon={faInfoCircle} />
                    <span className="tooltip-text">Enter the total amount in Rupees (must be positive).</span>
                  </div>
                </div>
                <div className="input-hint">Total price for your order in Rupees</div>
                {errors.amount && <div className="error-message" data-testid="amount-error">{errors.amount}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="address" className="form-label">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="label-icon" />
                  Delivery Address
                  <span className="required-indicator">*</span>
                </label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="address"
                    name="address"
                    className={`form-input ${errors.address ? 'error-input' : ''}`}
                    value={formData.address}
                    onChange={handleInputChange}
                    required
                    data-testid="address-input"
                  />
                  <div className="tooltip" data-testid="address-tooltip">
                    <FontAwesomeIcon icon={faInfoCircle} />
                    <span className="tooltip-text">Enter the complete delivery address for the order.</span>
                  </div>
                </div>
                <div className="input-hint">We'll deliver your order to this address</div>
                {errors.address && <div className="error-message" data-testid="address-error">{errors.address}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="phoneNumber" className="form-label">
                  <FontAwesomeIcon icon={faPhone} className="label-icon" />
                  Phone Number
                  <span className="required-indicator">*</span>
                </label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    id="phoneNumber"
                    name="phoneNumber"
                    className={`form-input ${errors.phoneNumber ? 'error-input' : ''}`}
                    value={formData.phoneNumber}
                    onChange={handleInputChange}
                    required
                    data-testid="phone-input"
                  />
                  <div className="tooltip" data-testid="phone-tooltip">
                    <FontAwesomeIcon icon={faInfoCircle} />
                    <span className="tooltip-text">Enter a 10-digit phone number for delivery updates.</span>
                  </div>
                </div>
                <div className="input-hint">We'll send delivery updates to this number</div>
                {errors.phoneNumber && <div className="error-message" data-testid="phone-error">{errors.phoneNumber}</div>}
              </div>

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  <FontAwesomeIcon icon={faEnvelope} className="label-icon" />
                  Email Address
                  <span className="required-indicator">*</span>
                </label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    className={`form-input ${errors.email ? 'error-input' : ''}`}
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    data-testid="email-input"
                  />
                  <div className="tooltip" data-testid="email-tooltip">
                    <FontAwesomeIcon icon={faInfoCircle} />
                    <span className="tooltip-text">Enter a valid email address for order confirmation.</span>
                  </div>
                </div>
                <div className="input-hint">Your order confirmation will be sent here</div>
                {errors.email && <div className="error-message" data-testid="email-error">{errors.email}</div>}
              </div>
            </div>

            {/* Button Group */}
            <div className="button-group">
              <button
                type="button"
                className="cancel-button"
                onClick={() => navigate('/orders')}
                data-testid="cancel-button"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-button"
                disabled={isSubmitting}
                data-testid="submit-button"
              >
                {isSubmitting ? (
                  <>
                    <span className="loading-spinner"></span>
                    <span>Processing...</span>
                  </>
                ) : (
                  'Place Order'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modern CSS */}
      <style jsx>{`
        /* Global Styles */
        .add-order-wrapper {
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          color: #0f172a;
          background-color: #f8fafc;
        }
        
        .add-order-container {
          max-width: 1280px;
          margin: 80px auto 40px;
          padding: 24px;
        }
        
        .form-container {
          max-width: 680px;
          margin: 0 auto;
        }
        
        /* Back Link */
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 20px;
          color: #0ea5e9;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.2s ease;
          padding: 6px 12px;
          border-radius: 6px;
        }
        
        .back-link:hover {
          color: #0284c7;
          background-color: rgba(14, 165, 233, 0.1);
        }
        
        /* Form */
        .add-order-form {
          background-color: white;
          border-radius: 12px;
          padding: 32px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
          animation: formFadeIn 0.5s ease;
        }
        
        @keyframes formFadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .add-order-form h1 {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
          margin-top: 0;
          margin-bottom: 24px;
          text-align: center;
        }
        
        /* Progress Bar */
        .progress-container {
          margin-bottom: 24px;
          position: relative;
        }
        
        .progress-bar {
          height: 8px;
          background-color: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }
        
        .progress-fill {
          height: 100%;
          background-color: #0ea5e9;
          border-radius: 4px;
          transition: width 0.3s ease;
        }
        
        .progress-text {
          position: absolute;
          right: 0;
          top: -20px;
          font-size: 0.75rem;
          color: #64748b;
          font-weight: 500;
        }
        
        /* Alerts */
        .alert {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 24px;
          font-size: 0.875rem;
          display: flex;
          align-items: center;
          gap: 8px;
          animation: alertFadeIn 0.3s ease;
        }
        
        @keyframes alertFadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .error-alert {
          background-color: #fee2e2;
          color: #b91c1c;
          border-left: 4px solid #ef4444;
        }
        
        .success-alert {
          background-color: #dcfce7;
          color: #15803d;
          border-left: 4px solid #22c55e;
        }
        
        /* PDF Button */
        .pdf-button {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          width: 100%;
          padding: 12px 16px;
          background-color: #8b5cf6;
          color: white;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          margin-bottom: 24px;
        }
        
        .pdf-button:hover {
          background-color: #7c3aed;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        /* Form Sections */
        .form-section {
          margin-bottom: 32px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e2e8f0;
        }
        
        .section-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #0f172a;
          margin-top: 0;
          margin-bottom: 16px;
          padding-bottom: 8px;
          border-bottom: 2px solid #e2e8f0;
        }
        
        /* Form Groups */
        .form-group {
          margin-bottom: 20px;
        }
        
        .form-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
          font-weight: 500;
          color: #334155;
        }
        
        .label-icon {
          color: #0ea5e9;
        }
        
        .required-indicator {
          color: #ef4444;
          margin-left: 4px;
        }
        
        .input-wrapper {
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .form-input {
          width: 100%;
          padding: 10px 12px;
          font-size: 0.9rem;
          border: 1px solid #cbd5e1;
          border-radius: 8px;
          background-color: white;
          transition: all 0.2s ease;
        }
        
        .form-input:focus {
          outline: none;
          border-color: #0ea5e9;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
        }
        
        .error-input {
          border-color: #ef4444;
          background-color: #fef2f2;
        }
        
        .error-input:focus {
          border-color: #ef4444;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2);
        }
        
        .input-hint {
          margin-top: 4px;
          font-size: 0.75rem;
          color: #64748b;
        }
        
        .error-message {
          margin-top: 6px;
          font-size: 0.75rem;
          color: #ef4444;
          background-color: #fee2e2;
          padding: 4px 8px;
          border-radius: 4px;
          animation: errorFadeIn 0.3s ease;
        }
        
        @keyframes errorFadeIn {
          from { opacity: 0; transform: translateY(-5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        /* Tooltip */
        .tooltip {
          position: relative;
          margin-left: 8px;
          color: #94a3b8;
          cursor: pointer;
        }
        
        .tooltip-text {
          visibility: hidden;
          position: absolute;
          width: 220px;
          background-color: #334155;
          color: white;
          text-align: center;
          border-radius: 6px;
          padding: 8px 12px;
          z-index: 100;
          bottom: 125%;
          left: 50%;
          transform: translateX(-50%);
          opacity: 0;
          transition: opacity 0.3s;
          font-size: 0.75rem;
          pointer-events: none;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .tooltip-text::after {
          content: "";
          position: absolute;
          top: 100%;
          left: 50%;
          margin-left: -5px;
          border-width: 5px;
          border-style: solid;
          border-color: #334155 transparent transparent transparent;
        }
        
        .tooltip:hover .tooltip-text {
          visibility: visible;
          opacity: 1;
        }
        
        /* Button Group */
        .button-group {
          display: flex;
          justify-content: space-between;
          margin-top: 24px;
          gap: 16px;
        }
        
        .submit-button, .cancel-button {
          flex: 1;
          padding: 12px 24px;
          border: none;
          border-radius: 8px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        
        .submit-button {
          background-color: #0ea5e9;
          color: white;
        }
        
        .submit-button:hover:not(:disabled) {
          background-color: #0284c7;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .submit-button:disabled {
          background-color: #cbd5e1;
          cursor: not-allowed;
        }
        
        .cancel-button {
          background-color: white;
          color: #64748b;
          border: 1px solid #cbd5e1;
        }
        
        .cancel-button:hover {
          background-color: #f1f5f9;
          color: #334155;
        }
        
        /* Loading Spinner */
        .loading-spinner {
          width: 16px;
          height: 16px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          border-top-color: white;
          animation: spin 0.8s linear infinite;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        /* Responsive Styles */
        @media (max-width: 768px) {
          .add-order-container {
            padding: 16px;
            margin-top: 70px;
          }
          
          .add-order-form {
            padding: 24px;
          }
          
          .form-label {
            font-size: 0.9rem;
          }
          
          .button-group {
            flex-direction: column-reverse;
          }
          
          .submit-button, .cancel-button {
            width: 100%;
          }
        }
        
        @media (max-width: 480px) {
          .add-order-form {
            padding: 16px;
          }
          
          .section-title {
            font-size: 1rem;
          }
        }
      `}</style>
    </div>
  );
};

export default AddOrder;