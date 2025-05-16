import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Mock function to simulate fetching transactions from Oxapay
// export const fetchOxapayTransactions = async (userId: string) => {
//   // In a real application, you would call the Oxapay API
//   // For now, we'll return mock data
  
//   // Simulate API delay
//   await new Promise(resolve => setTimeout(resolve, 500));
  
//   // Return some mock transactions
//   return [
//     {
//       id: `oxp-${Date.now()}-1`,
//       type: 'deposit',
//       amount: 1000,
//       currency: 'USD',
//       timestamp: new Date(),
//       status: 'completed'
//     },
//     {
//       id: `oxp-${Date.now()}-2`,
//       type: 'deposit',
//       amount: 500,
//       currency: 'USD',
//       timestamp: new Date(Date.now() - 86400000), // 1 day ago
//       status: 'completed'
//     },
//     {
//       id: `oxp-${Date.now()}-3`,
//       type: 'withdrawal',
//       amount: 1500,
//       currency: 'USD',
//       timestamp: new Date(Date.now() - 172800000), // 2 days ago
//       status: 'completed'
//     }
//   ];
// };

// In a real application, you would implement actual API calls to Oxapay
// For example:

export const fetchOxapayTransactions = async (userId: string) => {
  try {
    const response = await axios.get(
      `${process.env.OXAPAY_API_URL}/transactions`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.OXAPAY_API_KEY}`,
          'Content-Type': 'application/json'
        },
        params: {
          user_id: userId,
          limit: 50
        }
      }
    );
    
    return response.data.transactions;
  } catch (error) {
    console.error('Error fetching transactions from Oxapay:', error);
    throw error;
  }
};