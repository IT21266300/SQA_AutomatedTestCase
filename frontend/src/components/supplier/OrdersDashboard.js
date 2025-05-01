import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faPlus, 
  faEdit, 
  faTrash, 
  faChartPie, 
  faSearch, 
  faCalendar, 
  faMoneyBill, 
  faBoxes,
  faFileDownload,
  faSort,
  faSortUp,
  faSortDown
} from '@fortawesome/free-solid-svg-icons';
import MainNavbar from '../Home/MainNavbar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend);

const OrdersDashboard = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [orderStats, setOrderStats] = useState({
    totalOrders: 0,
    totalAmount: 0,
    averageOrderValue: 0,
    totalQuantity: 0,
  });
  const ordersPerPage = 10;

  // Fetch orders from backend
  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:5000/api/orders');
        const ordersData = response.data;
        setOrders(ordersData);

        // Calculate order statistics
        const stats = ordersData.reduce(
          (acc, order) => {
            acc.totalOrders++;
            acc.totalAmount += order.amount;
            acc.totalQuantity += order.quantity;
            return acc;
          },
          { totalOrders: 0, totalAmount: 0, totalQuantity: 0 }
        );

        stats.averageOrderValue = stats.totalOrders ? stats.totalAmount / stats.totalOrders : 0;
        setOrderStats(stats);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching orders:', error);
        setError('Failed to load orders. Please try again.');
        setLoading(false);
      }
    };

    fetchOrders();
  }, []);

  // Filter orders based on search term and date range
  const filteredOrders = React.useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch =
        order.wasteType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.phoneNumber?.includes(searchTerm) ||
        order.status?.toLowerCase().includes(searchTerm.toLowerCase());

      const orderDate = new Date(order.createdAt);
      const matchesDateRange =
        (!dateRange.start || orderDate >= new Date(dateRange.start)) &&
        (!dateRange.end || orderDate <= new Date(dateRange.end));

      return matchesSearch && matchesDateRange;
    });
  }, [orders, searchTerm, dateRange]);

  const handleSort = (key) => {
    const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';
    setSortConfig({ key, direction });
  };

  const sortedOrders = React.useMemo(() => {
    const sortedData = [...filteredOrders];
    if (sortConfig.key) {
      sortedData.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (a[sortConfig.key] > b[sortConfig.key]) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortedData;
  }, [filteredOrders, sortConfig]);

  // Get current orders for pagination
  const indexOfLastOrder = currentPage * ordersPerPage;
  const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
  const currentOrders = sortedOrders.slice(indexOfFirstOrder, indexOfLastOrder);
  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, dateRange]);

  const getStatusBadgeClass = (status) => {
    switch (status?.toLowerCase()) {
      case 'delivered':
        return 'status-badge delivered';
      case 'pending':
        return 'status-badge pending';
      case 'cancelled':
        return 'status-badge cancelled';
      case 'on delivery':
        return 'status-badge on-delivery';
      default:
        return 'status-badge';
    }
  };

  const handleOrderUpdate = async (id) => {
    const updatedStatus = prompt('Enter new status for the order (e.g., Delivered, Pending, Cancelled, On Delivery):');
    if (updatedStatus) {
      try {
        await axios.put(`http://localhost:5000/api/orders/${id}`, { status: updatedStatus });
        setOrders(
          orders.map((order) =>
            order._id === id ? { ...order, status: updatedStatus } : order
          )
        );
        alert('Order status updated successfully!');
      } catch (error) {
        console.error('Error updating order:', error);
        alert('Failed to update order.');
      }
    }
  };

  const handleOrderDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await axios.delete(`http://localhost:5000/api/orders/${id}`);
        setOrders(orders.filter((order) => order._id !== id));
        alert('Order deleted successfully!');
      } catch (error) {
        console.error('Error deleting order:', error);
        alert('Failed to delete order.');
      }
    }
  };

  // Calculate data for the pie chart
  const statusCounts = orders.reduce(
    (acc, order) => {
      if (order.status === 'Pending') acc.new += 1;
      else if (order.status === 'Delivered') acc.delivered += 1;
      else if (order.status === 'Cancelled') acc.cancelled += 1;
      else if (order.status === 'On Delivery') acc.onDelivery += 1;
      return acc;
    },
    { new: 0, delivered: 0, cancelled: 0, onDelivery: 0 }
  );

  const pieChartData = {
    labels: ['New Orders', 'On Delivery', 'Delivered', 'Cancelled'],
    datasets: [
      {
        data: [statusCounts.new, statusCounts.onDelivery, statusCounts.delivered, statusCounts.cancelled],
        backgroundColor: ['#34C759', '#FF9500', '#007AFF', '#FF3B30'],
        hoverBackgroundColor: ['#2DB44A', '#E68600', '#0066CC', '#E62E26'],
      },
    ],
  };

  const handleNavigateToAddOrder = () => {
    try {
      navigate('/orders/add');
    } catch (err) {
      console.error('Navigation error:', err);
      alert('Failed to navigate to the order form. Please check the console for errors.');
    }
  };

  // Generate PDF for a specific order
  const generateOrderPDF = (order) => {
    try {
      const doc = new jsPDF();
      
      // Add title
      doc.setFontSize(16);
      doc.text(`Order Details - ${order._id}`, 10, 10);

      // Add order summary
      doc.setFontSize(12);
      doc.text(`Waste Type: ${order.wasteType}`, 10, 20);
      doc.text(`Quantity: ${order.quantity}`, 10, 30);
      doc.text(`Amount: Rs. ${order.amount.toLocaleString()}`, 10, 40);
      doc.text(`Status: ${order.status}`, 10, 50);
      doc.text(`Order Date: ${new Date(order.createdAt).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })}`, 10, 60);
      doc.text(`Customer Email: ${order.email}`, 10, 70);
      doc.text(`Phone Number: ${order.phoneNumber}`, 10, 80);
      doc.text(`Address: ${order.address}`, 10, 90);

      // Add a table for order details
      autoTable(doc, {
        startY: 100,
        head: [['Field', 'Value']],
        body: [
          ['Waste Type', order.wasteType],
          ['Quantity', order.quantity.toString()],
          ['Amount', `Rs. ${order.amount.toLocaleString()}`],
          ['Status', order.status],
          ['Order Date', new Date(order.createdAt).toLocaleString('en-US')],
          ['Email', order.email],
          ['Phone Number', order.phoneNumber],
          ['Address', order.address],
        ],
        theme: 'striped',
        headStyles: { fillColor: [0, 121, 107] }, // Teal color for header
        styles: { fontSize: 10 },
      });

      // Save the PDF
      doc.save(`order_${order._id}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  // Render the sort icon based on current sort configuration
  const renderSortIcon = (columnName) => {
    if (sortConfig.key !== columnName) {
      return <FontAwesomeIcon icon={faSort} className="sort-icon" />;
    }
    return sortConfig.direction === 'asc' ? 
      <FontAwesomeIcon icon={faSortUp} className="sort-icon active" /> : 
      <FontAwesomeIcon icon={faSortDown} className="sort-icon active" />;
  };

  // Generate pagination buttons
  const renderPaginationButtons = () => {
    const buttons = [];
    const maxButtons = 5; // Maximum number of page buttons to show
    
    // Always show first page button
    buttons.push(
      <button
        key="first"
        onClick={() => setCurrentPage(1)}
        disabled={currentPage === 1}
        className="page-button"
      >
        First
      </button>
    );
    
    // Previous button
    buttons.push(
      <button
        key="prev"
        onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
        disabled={currentPage === 1}
        className="page-button"
      >
        &laquo;
      </button>
    );
    
    // Calculate start and end page numbers to display
    let startPage = Math.max(currentPage - Math.floor(maxButtons / 2), 1);
    let endPage = startPage + maxButtons - 1;
    
    if (endPage > totalPages) {
      endPage = totalPages;
      startPage = Math.max(endPage - maxButtons + 1, 1);
    }
    
    // Page number buttons
    for (let i = startPage; i <= endPage; i++) {
      buttons.push(
        <button
          key={i}
          onClick={() => setCurrentPage(i)}
          className={currentPage === i ? 'page-button active' : 'page-button'}
          data-testid={`page-${i}-button`}
        >
          {i}
        </button>
      );
    }
    
    // Next button
    buttons.push(
      <button
        key="next"
        onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
        disabled={currentPage === totalPages}
        className="page-button"
      >
        &raquo;
      </button>
    );
    
    // Last page button
    buttons.push(
      <button
        key="last"
        onClick={() => setCurrentPage(totalPages)}
        disabled={currentPage === totalPages}
        className="page-button"
      >
        Last
      </button>
    );
    
    return buttons;
  };

  if (loading) return (
    <div className="loading-container" data-testid="loading-indicator">
      <div className="loading-spinner"></div>
      <p>Loading orders...</p>
    </div>
  );
  
  if (error) return (
    <div className="error-container" data-testid="error-message">
      <div className="error-icon">!</div>
      <p>{error}</p>
      <button onClick={() => window.location.reload()} className="retry-button">
        Retry
      </button>
    </div>
  );

  return (
    <div className="orders-dashboard-wrapper">
      <MainNavbar />
      <div className="orders-dashboard-container">
        <div className="dashboard-header">
          <h1>Orders Dashboard</h1>
          <button 
            className="new-order-button" 
            onClick={handleNavigateToAddOrder}
            data-testid="add-order-button"
          >
            <FontAwesomeIcon icon={faPlus} /> New Order
          </button>
        </div>

        {/* Order Statistics */}
        <div className="stats-cards">
          <div className="stat-card" data-testid="total-orders-card">
            <FontAwesomeIcon icon={faBoxes} className="stat-icon" />
            <div className="stat-title">Total Orders</div>
            <div className="stat-value">{orderStats.totalOrders}</div>
          </div>
          <div className="stat-card" data-testid="total-amount-card">
            <FontAwesomeIcon icon={faMoneyBill} className="stat-icon" />
            <div className="stat-title">Total Amount</div>
            <div className="stat-value">Rs. {orderStats.totalAmount.toLocaleString()}</div>
          </div>
          <div className="stat-card" data-testid="average-order-card">
            <FontAwesomeIcon icon={faChartPie} className="stat-icon" />
            <div className="stat-title">Average Order Value</div>
            <div className="stat-value">Rs. {orderStats.averageOrderValue.toFixed(2)}</div>
          </div>
          <div className="stat-card" data-testid="total-quantity-card">
            <FontAwesomeIcon icon={faBoxes} className="stat-icon" />
            <div className="stat-title">Total Quantity</div>
            <div className="stat-value">{orderStats.totalQuantity}</div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="dashboard-filters">
          <div className="search-box">
            <FontAwesomeIcon icon={faSearch} className="search-icon" />
            <input
              type="text"
              placeholder="Search by waste type, email, phone, or status..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
              data-testid="search-input"
            />
          </div>
          <div className="date-filters">
            <div className="date-filter-label">
              <FontAwesomeIcon icon={faCalendar} className="calendar-icon" />
              <span>Filter by date:</span>
            </div>
            <div className="date-inputs">
              <input
                type="date"
                className="date-input"
                value={dateRange.start}
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                data-testid="start-date-input"
              />
              <span className="date-separator">to</span>
              <input
                type="date"
                className="date-input"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
                data-testid="end-date-input"
              />
            </div>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="dashboard-content">
          {/* Orders Summary with Pie Chart */}
          <div className="dashboard-section chart-section">
            <h2>
              <FontAwesomeIcon icon={faChartPie} /> Orders Summary
            </h2>
            <div className="orders-summary">
              <div className="chart-container" data-testid="orders-chart">
                <Pie
                  data={pieChartData}
                  options={{
                    maintainAspectRatio: true,
                    aspectRatio: 1,
                    plugins: {
                      legend: {
                        display: false,
                      },
                      tooltip: {
                        backgroundColor: '#00796b',
                        titleFont: {
                          size: 14,
                          family: "'Inter', 'Segoe UI', Arial, sans-serif",
                          weight: 'bold',
                        },
                        bodyFont: {
                          size: 13,
                          family: "'Inter', 'Segoe UI', Arial, sans-serif",
                        },
                        padding: 12,
                        cornerRadius: 8,
                        displayColors: true,
                        boxWidth: 10,
                        boxHeight: 10,
                        usePointStyle: true,
                      },
                    },
                  }}
                />
              </div>
              <div className="status-legend">
                <div className="status-item" data-testid="new-orders-legend">
                  <span className="status-color new"></span>
                  <span>New Orders: {statusCounts.new}</span>
                </div>
                <div className="status-item" data-testid="on-delivery-legend">
                  <span className="status-color on-delivery"></span>
                  <span>On Delivery: {statusCounts.onDelivery}</span>
                </div>
                <div className="status-item" data-testid="delivered-legend">
                  <span className="status-color delivered"></span>
                  <span>Delivered: {statusCounts.delivered}</span>
                </div>
                <div className="status-item" data-testid="cancelled-legend">
                  <span className="status-color cancelled"></span>
                  <span>Cancelled: {statusCounts.cancelled}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders Table */}
          <div className="dashboard-section orders-section">
            <h2>Recent Orders</h2>
            <div className="table-responsive">
              <table className="orders-table" data-testid="orders-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('wasteType')} data-testid="sort-waste-type">
                      Waste Type {renderSortIcon('wasteType')}
                    </th>
                    <th onClick={() => handleSort('quantity')} data-testid="sort-quantity">
                      Quantity {renderSortIcon('quantity')}
                    </th>
                    <th onClick={() => handleSort('amount')} data-testid="sort-amount">
                      Amount (Rs.) {renderSortIcon('amount')}
                    </th>
                    <th onClick={() => handleSort('status')} data-testid="sort-status">
                      Status {renderSortIcon('status')}
                    </th>
                    <th onClick={() => handleSort('createdAt')} data-testid="sort-date">
                      Order Date {renderSortIcon('createdAt')}
                    </th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrders.length > 0 ? (
                    currentOrders.map((order) => (
                      <tr key={order._id} data-testid={`order-row-${order._id}`}>
                        <td data-label="Waste Type">{order.wasteType}</td>
                        <td data-label="Quantity">{order.quantity}</td>
                        <td data-label="Amount">{order.amount.toLocaleString()}</td>
                        <td data-label="Status">
                          <span className={getStatusBadgeClass(order.status)}>{order.status}</span>
                        </td>
                        <td data-label="Order Date">
                          {new Date(order.createdAt).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>
                        <td data-label="Actions" className="action-buttons">
                          <button 
                            className="action-button update" 
                            onClick={() => handleOrderUpdate(order._id)}
                            data-testid={`update-button-${order._id}`}
                          >
                            <FontAwesomeIcon icon={faEdit} /> 
                            <span className="button-text">Update</span>
                          </button>
                          <button 
                            className="action-button delete" 
                            onClick={() => handleOrderDelete(order._id)}
                            data-testid={`delete-button-${order._id}`}
                          >
                            <FontAwesomeIcon icon={faTrash} /> 
                            <span className="button-text">Delete</span>
                          </button>
                          <button 
                            className="action-button pdf" 
                            onClick={() => generateOrderPDF(order)}
                            data-testid={`pdf-button-${order._id}`}
                          >
                            <FontAwesomeIcon icon={faFileDownload} /> 
                            <span className="button-text">PDF</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="no-orders-message">
                        No orders found. Try changing your search or filter criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {filteredOrders.length > 0 && (
              <div className="pagination" data-testid="pagination">
                {renderPaginationButtons()}
                <div className="pagination-info">
                  Showing {indexOfFirstOrder + 1} to {Math.min(indexOfLastOrder, filteredOrders.length)} of {filteredOrders.length} orders
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Modern CSS */}
      <style jsx>{`
        /* Global Styles */
        .orders-dashboard-wrapper {
          min-height: 100vh;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
          color: #1e293b;
          background-color: #f8fafc;
        }
        
        .orders-dashboard-container {
          max-width: 1280px;
          margin: 80px auto 40px;
          padding: 24px;
        }
        
        /* Dashboard Header */
        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }
        
        .dashboard-header h1 {
          font-size: 1.875rem;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        
        .new-order-button {
          display: flex;
          align-items: center;
          gap: 8px;
          background-color: #0ea5e9;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 10px 16px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
        }
        
        .new-order-button:hover {
          background-color: #0284c7;
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06);
        }
        
        /* Stats Cards */
        .stats-cards {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .stat-card {
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
          transition: transform 0.2s ease, box-shadow 0.2s ease;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .stat-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05);
        }
        
        .stat-icon {
          font-size: 1.5rem;
          color: #0ea5e9;
          margin-bottom: 12px;
        }
        
        .stat-title {
          font-size: 0.875rem;
          font-weight: 500;
          color: #64748b;
          margin-bottom: 8px;
        }
        
        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #0f172a;
        }
        
        /* Filters */
        .dashboard-filters {
          display: flex;
          gap: 16px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }
        
        .search-box {
          flex: 1;
          min-width: 250px;
          position: relative;
        }
        
        .search-input {
          width: 100%;
          padding: 10px 16px 10px 40px;
          font-size: 0.875rem;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background-color: white;
          transition: all 0.2s ease;
        }
        
        .search-input:focus {
          outline: none;
          border-color: #0ea5e9;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
        }
        
        .search-icon {
          position: absolute;
          top: 50%;
          left: 16px;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 0.875rem;
        }
        
        .date-filters {
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 320px;
        }
        
        .date-filter-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 0.875rem;
          color: #64748b;
        }
        
        .date-inputs {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .date-input {
          padding: 10px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.875rem;
          background-color: white;
          transition: all 0.2s ease;
          flex: 1;
          min-width: 130px;
        }
        
        .date-input:focus {
          outline: none;
          border-color: #0ea5e9;
          box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.2);
        }
        
        .date-separator {
          color: #64748b;
          font-size: 0.875rem;
        }
        
        /* Dashboard Content Layout */
        .dashboard-content {
          display: grid;
          grid-template-columns: 1fr 2fr;
          gap: 20px;
        }
        
        /* Dashboard Sections */
        .dashboard-section {
          background: white;
          border-radius: 12px;
          padding: 24px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
          margin-bottom: 24px;
        }
        
        .dashboard-section h2 {
          font-size: 1.25rem;
          font-weight: 600;
          color: #0f172a;
          margin-top: 0;
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .dashboard-section h2 svg {
          color: #0ea5e9;
        }
        
        /* Chart Section */
        .chart-section {
          height: fit-content;
        }
        
        .orders-summary {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 20px;
        }
        
        .chart-container {
          width: 100%;
          max-width: 300px;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
          transition: transform 0.3s ease;
        }
        
        .chart-container:hover {
          transform: translateY(-5px);
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        
        .status-legend {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          width: 100%;
        }
        
        .status-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 12px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          transition: all 0.2s ease;
        }
        
        .status-item:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
        }
        
        .status-color {
          width: 12px;
          height: 12px;
          border-radius: 3px;
        }
        
        .status-color.new {
          background: #34C759;
        }
        
        .status-color.on-delivery {
          background: #FF9500;
        }
        
        .status-color.delivered {
          background: #007AFF;
        }
        
        .status-color.cancelled {
          background: #FF3B30;
        }
        
        /* Table Styles */
        .table-responsive {
          overflow-x: auto;
          border-radius: 8px;
          background: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .orders-table {
          width: 100%;
          border-collapse: separate;
          border-spacing: 0;
          font-size: 0.875rem;
        }
        
        .orders-table th,
        .orders-table td {
          padding: 12px 16px;
          text-align: left;
          vertical-align: middle;
        }
        
        .orders-table th {
          background-color: #f8fafc;
          font-weight: 600;
          color: #334155;
          white-space: nowrap;
          position: sticky;
          top: 0;
          z-index: 10;
          cursor: pointer;
          transition: background-color 0.2s ease;
          border-bottom: 2px solid #e2e8f0;
        }
        
        .orders-table th:hover {
          background-color: #f1f5f9;
        }
        
        .sort-icon {
          margin-left: 5px;
          font-size: 0.75rem;
          color: #94a3b8;
          transition: all 0.2s ease;
        }
        
        .sort-icon.active {
          color: #0ea5e9;
        }
        
        .orders-table tbody tr {
          border-bottom: 1px solid #e2e8f0;
          transition: background-color 0.2s ease;
        }
        
        .orders-table tbody tr:last-child {
          border-bottom: none;
        }
        
        .orders-table tbody tr:hover {
          background-color: #f8fafc;
        }
        
        .orders-table td {
          color: #334155;
        }
        
        /* Status Badges */
        .status-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: capitalize;
          letter-spacing: 0.025em;
        }
        
        .status-badge.delivered {
          background-color: #dcfce7;
          color: #15803d;
        }
        
        .status-badge.pending {
          background-color: #fef3c7;
          color: #b45309;
        }
        
        .status-badge.cancelled {
          background-color: #fee2e2;
          color: #b91c1c;
        }
        
        .status-badge.on-delivery {
          background-color: #dbeafe;
          color: #1d4ed8;
        }
        
        /* Action Buttons */
        .action-buttons {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          white-space: nowrap;
        }
        
        .action-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border: none;
          border-radius: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }
        
        .action-button.update {
          background-color: #0ea5e9;
          color: white;
        }
        
        .action-button.update:hover {
          background-color: #0284c7;
        }
        
        .action-button.delete {
          background-color: #ef4444;
          color: white;
        }
        
        .action-button.delete:hover {
          background-color: #dc2626;
        }
        
        .action-button.pdf {
          background-color: #8b5cf6;
          color: white;
        }
        
        .action-button.pdf:hover {
          background-color: #7c3aed;
        }
        
        .action-button:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        /* Responsive Table */
        @media (max-width: 768px) {
          .orders-table thead {
            display: none;
          }
          
          .orders-table tbody tr {
            display: block;
            margin-bottom: 16px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          }
          
          .orders-table td {
            display: flex;
            padding: 12px 16px;
            justify-content: space-between;
            border-bottom: 1px solid #e2e8f0;
            text-align: right;
          }
          
          .orders-table td:last-child {
            border-bottom: none;
          }
          
          .orders-table td:before {
            content: attr(data-label);
            font-weight: 600;
            color: #64748b;
            text-align: left;
          }
          
          .action-buttons {
            justify-content: flex-end;
          }
        }
        
        /* Pagination */
        .pagination {
          display: flex;
          flex-wrap: wrap;
          justify-content: space-between;
          align-items: center;
          margin-top: 24px;
          gap: 16px;
        }
        
        .page-button {
          padding: 8px 12px;
          background-color: white;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.875rem;
          color: #334155;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .page-button:hover:not(:disabled) {
          background-color: #f8fafc;
          border-color: #cbd5e1;
        }
        
        .page-button.active {
          background-color: #0ea5e9;
          color: white;
          border-color: #0ea5e9;
          font-weight: 600;
        }
        
        .page-button:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }
        
        .pagination-info {
          font-size: 0.875rem;
          color: #64748b;
        }
        
        /* Loading and Error States */
        .loading-container,
        .error-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px;
          margin: 100px auto;
          max-width: 400px;
          background-color: white;
          border-radius: 12px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          text-align: center;
        }
        
        .loading-spinner {
          border: 4px solid rgba(14, 165, 233, 0.1);
          border-left-color: #0ea5e9;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin-bottom: 16px;
        }
        
        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }
        
        .error-icon {
          width: 48px;
          height: 48px;
          border-radius: 24px;
          background-color: #fee2e2;
          color: #ef4444;
          font-size: 24px;
          font-weight: bold;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 16px;
        }
        
        .retry-button {
          margin-top: 16px;
          padding: 8px 16px;
          background-color: #0ea5e9;
          color: white;
          border: none;
          border-radius: 6px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        
        .retry-button:hover {
          background-color: #0284c7;
        }
        
        .no-orders-message {
          text-align: center;
          padding: 24px;
          color: #64748b;
          font-style: italic;
        }
        
        /* Responsive Layout */
        @media (max-width: 1024px) {
          .dashboard-content {
            grid-template-columns: 1fr;
          }
          
          .chart-section {
            order: 1;
          }
        }
        
        @media (max-width: 640px) {
          .orders-dashboard-container {
            padding: 16px;
            margin-top: 60px;
          }
          
          .dashboard-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          
          .stats-cards {
            grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
          }
          
          .stat-card {
            padding: 16px;
          }
          
          .stat-value {
            font-size: 1.25rem;
          }
          
          .dashboard-section {
            padding: 16px;
          }
        }
      `}</style>
    </div>
  );
};

export default OrdersDashboard;