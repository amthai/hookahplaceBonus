// Глобальное хранилище данных
// В реальном приложении это было бы в базе данных

// Инициализируем хранилище данных
let users, visits, bonuses, nextUserId, nextVisitId, nextBonusId;

if (typeof global !== 'undefined') {
  // Node.js environment
  if (!global.hookahplaceData) {
    global.hookahplaceData = {
      users: new Map(),
      visits: new Map(),
      bonuses: new Map(),
      nextUserId: 1,
      nextVisitId: 1,
      nextBonusId: 1
    };
  }
  users = global.hookahplaceData.users;
  visits = global.hookahplaceData.visits;
  bonuses = global.hookahplaceData.bonuses;
  nextUserId = global.hookahplaceData.nextUserId;
  nextVisitId = global.hookahplaceData.nextVisitId;
  nextBonusId = global.hookahplaceData.nextBonusId;
} else {
  // Browser environment - fallback
  if (!window.hookahplaceData) {
    window.hookahplaceData = {
      users: new Map(),
      visits: new Map(),
      bonuses: new Map(),
      nextUserId: 1,
      nextVisitId: 1,
      nextBonusId: 1
    };
  }
  users = window.hookahplaceData.users;
  visits = window.hookahplaceData.visits;
  bonuses = window.hookahplaceData.bonuses;
  nextUserId = window.hookahplaceData.nextUserId;
  nextVisitId = window.hookahplaceData.nextVisitId;
  nextBonusId = window.hookahplaceData.nextBonusId;
}

export { users, visits, bonuses, nextUserId, nextVisitId, nextBonusId };

export function incrementUserId() {
  const id = nextUserId++;
  if (typeof global !== 'undefined') {
    global.hookahplaceData.nextUserId = nextUserId;
  } else {
    window.hookahplaceData.nextUserId = nextUserId;
  }
  return id;
}

export function incrementVisitId() {
  const id = nextVisitId++;
  if (typeof global !== 'undefined') {
    global.hookahplaceData.nextVisitId = nextVisitId;
  } else {
    window.hookahplaceData.nextVisitId = nextVisitId;
  }
  return id;
}

export function incrementBonusId() {
  const id = nextBonusId++;
  if (typeof global !== 'undefined') {
    global.hookahplaceData.nextBonusId = nextBonusId;
  } else {
    window.hookahplaceData.nextBonusId = nextBonusId;
  }
  return id;
}
