import { scheduleGuard } from '../src/schedule_guard.js';

console.log('🧪 === PRUEBAS DEL CONTROL DE HORARIOS (NATHALY GAMBOA) ===\n');

const testCases = [
  {
    desc: 'Martes a las 8:30 AM (Horario de la mañana)',
    isoTime: '2026-09-15T08:30:00', // Martes
    expectedOpen: true
  },
  {
    desc: 'Miércoles a la 1:15 PM (Jornada continua mediodía)',
    isoTime: '2026-09-16T13:15:00', // Miércoles
    expectedOpen: true
  },
  {
    desc: 'Viernes a las 6:15 PM (Antes del cierre de las 6:30 PM)',
    isoTime: '2026-09-18T18:15:00', // Viernes
    expectedOpen: true
  },
  {
    desc: 'Viernes a las 6:45 PM (Después del cierre)',
    isoTime: '2026-09-18T18:45:00', // Viernes
    expectedOpen: false
  },
  {
    desc: 'Sábado a las 10:00 AM (Día no laboral)',
    isoTime: '2026-09-19T10:00:00', // Sábado
    expectedOpen: false
  },
  {
    desc: 'Domingo a las 3:00 PM (Día no laboral)',
    isoTime: '2026-09-20T15:00:00', // Domingo
    expectedOpen: false
  }
];

let allPassed = true;

for (const tc of testCases) {
  const result = scheduleGuard.isWithinOperatingHours(tc.isoTime);
  const passed = result.isOpen === tc.expectedOpen;

  if (passed) {
    console.log(`✅ PASÓ: [${tc.desc}] -> isOpen: ${result.isOpen}`);
  } else {
    allPassed = false;
    console.error(`❌ FALLÓ: [${tc.desc}] -> Se esperaba isOpen: ${tc.expectedOpen}, pero se obtuvo: ${result.isOpen}`);
    console.error(`   Detalles:`, result);
  }
}

console.log('\n----------------------------------------------------');
if (allPassed) {
  console.log('🎉 ¡Todas las pruebas de validación de horarios pasaron con éxito!\n');
} else {
  console.error('⚠️ Algunas pruebas fallaron.');
  process.exit(1);
}

// Probar mensaje de fuera de horario
console.log('📜 Vista previa del mensaje de fuera de horario:');
console.log('----------------------------------------------------');
console.log(scheduleGuard.getOffHoursMessage());
console.log('----------------------------------------------------\n');
