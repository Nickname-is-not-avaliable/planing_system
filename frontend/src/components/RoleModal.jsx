// src/components/RoleModal.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './RoleModal.css';

const RoleModal = ({ isOpen, onClose }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="modal-content"
            initial={{ y: "-10%", opacity: 0 }}
            animate={{ y: "0%", opacity: 1 }}
            exit={{ y: "-10%", opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <button className="close-button" onClick={onClose}>✖</button>
            <h2>Возможности по ролям</h2>
            <p><strong>Администратор:</strong> Полный доступ ко всем данным.</p>
            <p><strong>Аналитик:</strong> Планирование и оценка.</p>
            <p><strong>Исполнитель:</strong> Выполнение планов и отчёты.</p>
            <p style={{ marginTop: "1rem", fontSize: "0.9rem", color: "#666" }}>
              Подробности смотрите в документации или обратитесь к администратору.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RoleModal;
