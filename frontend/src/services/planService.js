// src/services/planService.js
import api from './api';

const getAllPlans = () => {
  return api.get('/plans');
};

const getPlanById = (id) => {
  return api.get(`/plans/${id}`);
};

const createPlan = (planData) => {
  // Убедись, что planData соответствует CreatePlanDto
  return api.post('/plans', planData);
};

const updatePlan = (id, planData) => {
    // Убедись, что planData соответствует CreatePlanDto
    return api.put(`/plans/${id}`, planData);
}

const deletePlan = (id) => {
    return api.delete(`/plans/${id}`);
}

// Добавь другие необходимые функции

const planService = {
  getAllPlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
};

export default planService;