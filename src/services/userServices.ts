import axios, { AxiosInstance } from "axios";
const API_URL = import.meta.env.VITE_API_URL;

export class userServices {
  axiosInstance: AxiosInstance;
  constructor(jwt: string) {
    this.axiosInstance = axios.create({
      baseURL: API_URL,
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
    });
  }

  async getAllUsers() {
    try {
      const response = await this.axiosInstance.get(
        `${API_URL}/user/admin/getAllUser`
      );
      return response.data;
    } catch (error) {
      throw new Error(error as string);
    }
  }
}
