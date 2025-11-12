import axios from 'axios';

const API_BASE_URL = '/api';

export const resolveDNS = async (domain, recordType, mode, config) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/resolve`, {
      domain,
      recordType,
      mode,
      config
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.error || 'Network error occurred');
  }
};

export const checkHealth = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.data;
  } catch (error) {
    throw new Error('Server is not responding');
  }
};

