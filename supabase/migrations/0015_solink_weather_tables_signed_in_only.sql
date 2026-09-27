-- Security fix (Yellow, 2026-09-27): weather_records and environmental_records
-- hold a latitude and longitude per reading and were readable by anyone.
-- Both are empty and nothing on the site reads them, but a future feature
-- that stores readings at customers' homes would have published those
-- locations. Reading now needs a signed-in account.
alter policy "weather read" on weather_records to authenticated;
alter policy "environmental read" on environmental_records to authenticated;
