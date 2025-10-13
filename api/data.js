// Глобальное хранилище данных
// В реальном приложении это было бы в базе данных

// Используем глобальные переменные для синхронизации между API endpoints
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
  var { users, visits, bonuses, nextUserId, nextVisitId, nextBonusId } = global.hookahplaceData;
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
  var { users, visits, bonuses, nextUserId, nextVisitId, nextBonusId } = window.hookahplaceData;
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
