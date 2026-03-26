// Rotation Module — Weekly Task Assignment Logic

/**
 * Get the current week number since rotation started (1-based)
 */
export function getCurrentWeekNumber(rotationStartDate) {
  if (!rotationStartDate) return 0;

  const start = rotationStartDate.toDate ? rotationStartDate.toDate() : new Date(rotationStartDate);
  const now = new Date();
  const msPerWeek = 1000 * 60 * 60 * 24 * 7;
  const diffTime = Math.max(0, now.getTime() - start.getTime());
  return Math.floor(diffTime / msPerWeek) + 1;
}

/**
 * Calculate current assignments based on group data
 * 
 * Logic:
 * - `members` is the ordered array of UIDs
 * - `initialOrder` is a random shuffle of indices (e.g., [2, 0, 3, 1])
 * - For Week 1: member at initialOrder[i] gets task[i]
 * - For Week N: rotate the initialOrder array by (N-1) positions clockwise
 * 
 * Returns: { [uid]: { taskName, taskIcon, taskIndex } }
 */
export function calculateCurrentAssignments(group) {
  const { members, tasks, taskIcons, initialOrder, rotationStartDate } = group;

  if (!tasks || tasks.length === 0 || !initialOrder || initialOrder.length === 0) {
    return null;
  }

  const weekNumber = getCurrentWeekNumber(rotationStartDate);
  if (weekNumber === 0) return null;

  const numMembers = members.length;
  const numTasks = tasks.length;

  // Shift amount for rotation (0-based: week 1 = shift 0)
  const shift = (weekNumber - 1) % numMembers;

  // Build the assignment: for each task index, which member index does it?
  // Week 1: task[i] is assigned to members[initialOrder[i]]
  // Week N: rotate the initialOrder by 'shift' positions to the right
  // Rotating right by 'shift': new[i] = old[(i - shift + len) % len]
  const assignments = {};

  for (let taskIdx = 0; taskIdx < numTasks; taskIdx++) {
    // Which position in the initial order?
    const rotatedIdx = (taskIdx + shift) % numMembers;
    const memberIdx = initialOrder[rotatedIdx];

    if (memberIdx < numMembers) {
      const uid = members[memberIdx];
      assignments[uid] = {
        taskName: tasks[taskIdx],
        taskIcon: taskIcons[taskIdx] || '📋',
        taskIndex: taskIdx
      };
    }
  }

  return assignments;
}

/**
 * Get all weeks' assignments for preview/history
 */
export function getWeekAssignments(group, weekNumber) {
  const { members, tasks, taskIcons, initialOrder } = group;

  if (!tasks || tasks.length === 0 || !initialOrder || initialOrder.length === 0) {
    return null;
  }

  const numMembers = members.length;
  const numTasks = tasks.length;
  const shift = (weekNumber - 1) % numMembers;

  const assignments = [];

  for (let taskIdx = 0; taskIdx < numTasks; taskIdx++) {
    const rotatedIdx = (taskIdx + shift) % numMembers;
    const memberIdx = initialOrder[rotatedIdx];

    if (memberIdx < numMembers) {
      assignments.push({
        taskName: tasks[taskIdx],
        taskIcon: taskIcons[taskIdx] || '📋',
        memberUid: members[memberIdx]
      });
    }
  }

  return assignments;
}
