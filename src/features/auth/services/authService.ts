import api from "../../../lib/axios";

export const login = async (data: {email: string, password: string}) => {
    const response = await api.put("/auth/users/login",data,{withCredentials:true})
    console.log(response)
    return response.data;
}

export const logout = async () => {
    const response = await api.put("/auth/users/logout",{},{withCredentials:true});
    return response.data;
}

export const getProfile = async () => {
    const response = await api.get("/auth/users/profile",{withCredentials:true});
    return response.data
}