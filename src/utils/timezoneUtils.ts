import { format, parseISO } from 'date-fns';
import { fromZonedTime, toZonedTime } from 'date-fns-tz';
import { ptBR } from 'date-fns/locale';

const BRASILIA_TIMEZONE = 'America/Sao_Paulo';

/**
 * Converte uma data local para UTC mantendo o horário de Brasília
 * @param date - Data no formato local ou string
 * @returns Data em UTC que representa o mesmo horário em Brasília
 */
export const convertBrasiliaToUTC = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return fromZonedTime(dateObj, BRASILIA_TIMEZONE);
};

/**
 * Converte uma data UTC para o horário de Brasília
 * @param date - Data em UTC ou string
 * @returns Data no horário de Brasília
 */
export const convertUTCToBrasilia = (date: Date | string): Date => {
  const dateObj = typeof date === 'string' ? parseISO(date) : date;
  return toZonedTime(dateObj, BRASILIA_TIMEZONE);
};

/**
 * Formata uma data para exibição no horário de Brasília
 * @param date - Data em UTC ou string
 * @param formatString - Formato desejado (padrão: 'dd/MM/yyyy HH:mm')
 * @returns String formatada no horário de Brasília
 */
export const formatDateInBrasilia = (
  date: Date | string, 
  formatString: string = 'dd/MM/yyyy HH:mm'
): string => {
  const brasiliaDate = convertUTCToBrasilia(date);
  return format(brasiliaDate, formatString, { locale: ptBR });
};

/**
 * Converte data para formato datetime-local (usado em inputs HTML)
 * mantendo o horário de Brasília
 * @param date - Data em UTC ou string
 * @returns String no formato YYYY-MM-DDTHH:mm para input datetime-local
 */
export const convertToDateTimeLocal = (date: Date | string): string => {
  const brasiliaDate = convertUTCToBrasilia(date);
  return format(brasiliaDate, "yyyy-MM-dd'T'HH:mm");
};

/**
 * Converte valor de input datetime-local para UTC
 * @param dateTimeLocal - String no formato YYYY-MM-DDTHH:mm
 * @returns Data em UTC
 */
export const convertFromDateTimeLocal = (dateTimeLocal: string): Date => {
  // Cria a data como se fosse no horário de Brasília
  const localDate = parseISO(dateTimeLocal);
  return convertBrasiliaToUTC(localDate);
};