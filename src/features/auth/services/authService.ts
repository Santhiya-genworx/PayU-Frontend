import api from "../../../lib/axios";

export const login = async (data: {email: string, password: string}) => {
    const response = await api.put("/auth/users/login",data,{withCredentials:true})
    return response.data;
}

export const logout = async () => {
    const response = await api.put("/auth/users/logout",{},{withCredentials:true});
    return response.data;
}

export const getProfile = async () => {
    const response = await api.get("/auth/users/me",{withCredentials:true});
    return response.data
}

export const refresh = async () => {
    const response = await api.get("/auth/refresh", { withCredentials: true })
    return response.data;
}