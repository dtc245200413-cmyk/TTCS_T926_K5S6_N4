import axiosClient from './axiosClient';

const roleApi = {
  getAll: () => {
    return axiosClient.get('/roles');
  }
};

export default roleApi;
