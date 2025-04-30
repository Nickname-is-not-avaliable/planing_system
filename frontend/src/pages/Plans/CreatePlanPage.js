// src/pages/Plans/CreatePlanPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import planService from '../../services/planService'; // <--- ИЗМЕНЕНО ../ на ../../
import userService from '../../services/userService'; // <--- ИЗМЕНЕНО ../ на ../../
import useAuth from '../../hooks/useAuth'; // Если бы использовался, тоже ../../
import './CreatePlanPage.css'; // Этот импорт остается т.к. CSS рядом

const CreatePlanPage = () => {
  const { user } = useAuth(); // Временно не используем user для createdById
  const navigate = useNavigate();
  const [users, setUsers] = useState([]); // Список пользователей для выбора
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [planData, setPlanData] = useState({
    name: '',
    description: '',
    targetValue: '', // В input это строка, будет преобразовано в число (или 0)
    startDate: '',   // Формат YYYY-MM-DD
    endDate: '',     // Формат YYYY-MM-DD
    executorUserIds: [], // Массив ID выбранных исполнителей
    // 'items' поле не используется при создании
  });

  // Загрузка списка пользователей (исполнителей) при монтировании
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const response = await userService.getAllUsers();
        // Фильтруем, оставляем только нужные роли (уточни, если нужно)
        const executors = response.data.filter(u => u.userRole === 'EXECUTOR' || u.userRole === 'USER');
        setUsers(executors);
      } catch (err) {
        console.error("Failed to fetch users:", err);
        setError('Не удалось загрузить список исполнителей. Проверьте консоль.');
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []); // Пустой массив зависимостей - выполнить один раз

  // Обработчик для обычных полей ввода
  const handleChange = (e) => {
    const { name, value } = e.target;
    setPlanData({ ...planData, [name]: value });
  };

  // Обработчик для мульти-селекта исполнителей
  const handleExecutorsChange = (e) => {
    // Получаем массив числовых ID из выбранных опций
    const selectedIds = Array.from(e.target.selectedOptions, option => parseInt(option.value, 10));
    setPlanData({ ...planData, executorUserIds: selectedIds });
  };

  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); // Сбрасываем предыдущие ошибки

    // --- ПРОВЕРКА АВТОРИЗАЦИИ ---
    if (!user || !user.id) {
        setError('Необходимо войти в систему для создания плана.');
        return;
    }
    // --- КОНЕЦ ПРОВЕРКИ ---

    setLoading(true);

    // --- Валидация на стороне клиента (базовая) ---
    if (!planData.name.trim() || planData.name.length < 3) {
        setError('Название плана должно содержать не менее 3 символов.');
        setLoading(false);
        return;
    }
    if (planData.executorUserIds.length === 0) {
        setError('Выберите хотя бы одного исполнителя.');
        setLoading(false);
        return;
    }
    if (!planData.startDate || !planData.endDate) {
        setError('Укажите даты начала и окончания плана.');
        setLoading(false);
        return;
    }
    if (new Date(planData.startDate) > new Date(planData.endDate)) {
         setError('Дата начала не может быть позже даты окончания.');
         setLoading(false);
         return;
    }
    // --- Конец валидации ---

    // Подготовка данных для отправки в API
    const dataToSend = {
      name: planData.name.trim(),
      description: planData.description.trim(),
      // Преобразуем targetValue в число, используем 0 если пусто или некорректно
      targetValue: planData.targetValue ? parseFloat(planData.targetValue) : 0,
      startDate: planData.startDate,
      endDate: planData.endDate,
      // Убеждаемся в уникальности ID (хотя select multiple сам это делает)
      executorUserIds: [...new Set(planData.executorUserIds)],
      createdByUserId: user.id,
    };

    // Дополнительная проверка на NaN после parseFloat
    if (isNaN(dataToSend.targetValue)) {
         setError('Некорректное значение для "Целевого значения". Введите число.');
         setLoading(false);
         return;
    }


    // Отправка данных в API
    try {
      console.log("Sending plan data:", dataToSend);// Лог для отладки
      await planService.createPlan(dataToSend);
      // При успехе - переход на список планов с сообщением
      navigate('/plans', { state: { message: 'План успешно создан!' } });
    } catch (err) {
      console.error("Failed to create plan:", err);
      // Обработка ошибки от API
      let errorMessage = 'Не удалось создать план.';
      if (err.response?.data) {
          if (typeof err.response.data === 'string') {
              errorMessage = err.response.data; // Просто строка ошибки
          } else if (err.response.data.message) {
              errorMessage = err.response.data.message; // Объект с полем message
          } else if (err.response.data.errors) { // Объект с ошибками валидации
              errorMessage = Object.values(err.response.data.errors).flat().join(' ');
          }
      } else if (err.message) {
          errorMessage = err.message; // Ошибка сети или другая
      }
      setError(errorMessage); // Показываем ошибку пользователю
    } finally {
      setLoading(false); // Убираем индикатор загрузки
    }
  };

  // --- БЛОКИРОВКА ФОРМЫ ЕСЛИ НЕТ ПОЛЬЗОВАТЕЛЯ ---
  if (!user) {
    return (
        <div className="create-plan-container">
            <h2>Создание нового плана</h2>
            <p className="error-message">Пожалуйста, <Link to="/login">войдите в систему</Link>, чтобы создать план.</p>
        </div>
    );
  }
  // --- КОНЕЦ БЛОКИРОВКИ ---

  // Рендеринг компонента
  return (
    <div className="create-plan-container">
      <h2>Создание нового плана</h2>

      {/* Отображение общей ошибки формы */}
      {error && <p className="error-message">{error}</p>}

      <form onSubmit={handleSubmit} className="create-plan-form">
        {/* Поле: Название плана */}
        <div className="form-group">
          <label htmlFor="name">Название плана*:</label>
          <input
            type="text"
            id="name"
            name="name"
            value={planData.name}
            onChange={handleChange}
            required
            minLength="3"
            disabled={loading}
            aria-describedby="name-help"
          />
           <small id="name-help">Минимум 3 символа.</small>
        </div>

        {/* Поле: Описание */}
        <div className="form-group">
          <label htmlFor="description">Описание:</label>
          <textarea
            id="description"
            name="description"
            value={planData.description}
            onChange={handleChange}
            rows="3"
            disabled={loading}
          ></textarea>
        </div>

        {/* Поле: Целевое значение */}
        <div className="form-group">
          <label htmlFor="targetValue">Целевое значение:</label>
          <input
            type="number"
            id="targetValue"
            name="targetValue"
            value={planData.targetValue}
            onChange={handleChange}
            step="any" // Разрешает ввод дробных чисел
            disabled={loading}
            placeholder="Введите число (например, 100 или 12.5)"
          />
        </div>

        {/* Поля: Даты начала и окончания (в одном ряду) */}
        <div className="form-group form-row">
          <div className="form-group-half">
             <label htmlFor="startDate">Дата начала*:</label>
             <input
                type="date"
                id="startDate"
                name="startDate"
                value={planData.startDate}
                onChange={handleChange}
                required
                disabled={loading}
             />
          </div>
           <div className="form-group-half">
             <label htmlFor="endDate">Дата окончания*:</label>
             <input
                type="date"
                id="endDate"
                name="endDate"
                value={planData.endDate}
                onChange={handleChange}
                required
                disabled={loading}
             />
            </div>
        </div>

        {/* Поле: Выбор исполнителей */}
        <div className="form-group">
          <label htmlFor="executorUserIds">Исполнители*:</label>
          {loadingUsers ? (
            <p>Загрузка списка исполнителей...</p>
          ) : users.length > 0 ? (
            <select
              id="executorUserIds"
              name="executorUserIds"
              multiple // Разрешает выбор нескольких
              // value должен быть массивом строк для multiple select
              value={planData.executorUserIds.map(String)}
              onChange={handleExecutorsChange}
              required
              disabled={loading}
              size="5" // Количество видимых опций
              aria-describedby="executors-help"
            >
              {/* Генерируем опции из загруженного списка пользователей */}
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email}) - {u.userRole}
                </option>
              ))}
            </select>
          ) : (
            // Сообщение, если исполнители не найдены или не загружены
            <p style={{ color: 'orange' }}>Нет доступных исполнителей для выбора.</p>
          )}
           <small id="executors-help">Выберите одного или нескольких (удерживая Ctrl/Cmd).</small>
        </div>

        {/* Кнопка отправки формы */}
        <button type="submit" disabled={loading || loadingUsers}>
          {loading ? 'Создание...' : 'Создать план'}
        </button>
      </form>
    </div>
  );
};

export default CreatePlanPage;