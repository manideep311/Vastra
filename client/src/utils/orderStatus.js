// Mirrors ORDER_STATUSES in server/src/models/Order.js — orders only move forward.
export const ORDER_FLOW = ['pending', 'accepted', 'preparing', 'ready_for_dispatch', 'completed'];
