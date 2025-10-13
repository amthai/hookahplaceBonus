// Общий модуль для хранения данных
// В реальном приложении это было бы в базе данных

let users = new Map();
let visits = new Map();
let bonuses = new Map();
let nextUserId = 1;
let nextVisitId = 1;
let nextBonusId = 1;

export { users, visits, bonuses, nextUserId, nextVisitId, nextBonusId };

export function incrementUserId() {
  return nextUserId++;
}

export function incrementVisitId() {
  return nextVisitId++;
}

export function incrementBonusId() {
  return nextBonusId++;
}
