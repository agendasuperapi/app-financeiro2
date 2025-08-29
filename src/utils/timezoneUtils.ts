import { fromZonedTime, toZonedTime, format } from 'date-fns-tz';

// Fuso horário de Brasília
const BRAZIL_TIMEZONE = 'America/Sao_Paulo';

/**
 * Converte uma data do horário de Brasília para UTC (para salvar no banco)
 */
export const convertBrazilTimeToUTC = (date: Date | string): Date => {
  const localDate = typeof date === 'string' ? new Date(date) : date;
  return fromZonedTime(localDate, BRAZIL_TIMEZONE);
};

/**
 * Converte uma data UTC para o horário de Brasília (para exibir na UI)
 */
export const convertUTCToBrazilTime = (date: Date | string): Date => {
  const utcDate = typeof date === 'string' ? new Date(date) : date;
  return toZonedTime(utcDate, BRAZIL_TIMEZONE);
};

/**
 * Formata uma data para datetime-local input no horário de Brasília
 */
export const formatForDateTimeLocalInput = (date: Date | string): string => {
  const brazilDate = convertUTCToBrazilTime(date);
  return format(brazilDate, "yyyy-MM-dd'T'HH:mm", { timeZone: BRAZIL_TIMEZONE });
};

/**
 * Obtém a data atual no horário de Brasília
 */
export const getCurrentBrazilTime = (): Date => {
  return toZonedTime(new Date(), BRAZIL_TIMEZONE);
};

/**
 * Formata uma data para exibição no horário de Brasília
 */
export const formatBrazilTime = (date: Date | string, formatString: string = 'dd/MM/yyyy HH:mm'): string => {
  const brazilDate = convertUTCToBrazilTime(date);
  return format(brazilDate, formatString, { timeZone: BRAZIL_TIMEZONE });
};