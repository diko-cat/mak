# Демо-хранилище: контракт для экранов

Сайт — frontend-демо без сервера. Все данные синтетические и лежат в `localStorage` этого браузера.
Экраны **не читают и не пишут localStorage сами**, а вызывают функции из `src/api` (асинхронные, как будущий бэкенд).
Права проверяются внутри этих функций по текущей демо-сессии; ошибки — `ApiError` с полем `code`.

## Подписка на изменения

```ts
import { useDemoDataRevision } from '../../store/demoData'

const revision = useDemoDataRevision()
useEffect(() => { void reload() }, [reload, revision])
```

`revision` растёт после любого изменения: в этой вкладке и в других вкладках того же браузера.
Уже подключено в `useAdminData`, `useDoctorData`, `usePatientData` — экраны на этих хуках обновляются сами.

## Врач на смене (`DoctorPresence`)

Приход врача на работу. **Не путать** с приходом пациента на приём (`Appointment.patientArrivedAt`).

| Функция | Кто | Что делает |
| --- | --- | --- |
| `markDoctorArrival(): Promise<DoctorPresence>` | врач | Отмечает себя на сегодня. Повторный вызов возвращает первую отметку. |
| `clearDoctorArrival({ doctorId?, reason? }): Promise<void>` | врач — себя; админ — любого, `reason` обязателен | Снимает отметку **за сегодня**. Нет отметки — ничего не делает. |
| `getMyArrival(date?): Promise<DoctorPresence \| null>` | врач | Своя отметка за день (`YYYY-MM-DD`, по умолчанию сегодня). |
| `getDoctorArrivals(date?): Promise<DoctorPresence[]>` | админ | Отметки всех врачей за день, по времени. |
| `getPresenceEvents(date?): Promise<PresenceEvent[]>` | админ — все; врач — свои | История «отметил / снял»: кто, когда, причина. |

`DoctorPresence = { doctorId, date, arrivedAt }`. Тип `DoctorArrival` — старое имя того же типа.

## Записи на приём

| Функция | Кто | Правила |
| --- | --- | --- |
| `markPatientArrived(appointmentId)` | врач — свой приём; админ — любой | Только активная запись и только в день приёма. Повторно — без изменений. |
| `updateAppointmentStatus(id, 'cancelled', reason)` | пациент — своя; врач — свой; админ — любая | Только активная запись. `reason` обязателен для врача и админа. |
| `updateAppointmentStatus(id, 'no-show', reason)` | врач — свой; админ — любой | Приём уже начался, приход пациента не отмечен. `reason` обязателен для врача. |
| `updateAppointmentStatus(id, 'confirmed')` | админ | Только `requested`. |
| `rescheduleAppointment(id, startsAt, doctorId?, reason?)` | врач — свой, без смены врача; админ — любой, может сменить врача той же специальности | `reason` обязателен для врача. API заново проверяет прошедшее время, рабочие часы и отсутствия, занятость врача и пациента. Талон и id записи не меняются. |
| `getAppointmentEvents(appointmentId?)` | пациент — свои; врач — свои; админ — все | Полная история записи по времени. |
| `resetDemoData()` | любой | Возвращает исходные фикстуры во всех вкладках. Сессия и тема остаются. |

Поля записи, которые заполняет API: `cancelledBy`, `cancellationReason`, `cancelledAt`,
`noShowMarkedBy`, `noShowReason`, `noShowMarkedAt`, `rescheduledFrom` (самое первое время),
`rescheduledBy`, `rescheduledAt`, `rescheduleReason`, `patientArrivedAt`, `patientArrivalMarkedBy`.

Каждое действие пишет `AppointmentEvent`: `type` (`created` | `confirmed` | `patient-arrived` | `rescheduled` |
`cancelled` | `no-show` | `completed`), `actorRole`, `actorUserId`, `at`, `reason`, `previous` и `next`
(снимки `{ status, startsAt, doctorId }` до и после).

## Частые коды ошибок

`UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR` (нет причины), `INVALID_STATUS_TRANSITION`, `SLOT_TAKEN`,
`PATIENT_APPOINTMENT_CONFLICT`, `PAST_APPOINTMENT`, `OUTSIDE_WORKING_HOURS`, `SAME_APPOINTMENT_TIME`,
`NOT_APPOINTMENT_DAY`, `PATIENT_ALREADY_ARRIVED`. Текст ошибки (`message`) можно показывать пользователю как есть.

## Хранение

- Ключ `sana-clinic.database.v6`, в данных поле `schemaVersion: 6`.
- Данные из `v5` и `v4` переносятся автоматически, старые ключи удаляются.
- Повреждённый JSON, неверная структура или более новая версия схемы → исходные синтетические фикстуры.
- Пометки «просмотрено» кабинета пациента — `src/store/seenIds.ts`, сбрасываются вместе с демо-данными.
- Демо-сценарии: по аккаунту на каждого врача (`doctor2@sana.demo` …) и пациента (`patient2@sana.demo` …), пароли синтетические.
