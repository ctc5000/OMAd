const moment = require('moment');

class DateUtils {
    /**
     * Получить диапазон дат для отчета
     * 
     * @param {string} period - Период ('today', 'yesterday', 'this_week', 'this_month')
     * @returns {Object} Объект с fromDate и toDate
     */
    static getDateRange(period) {
        const today = moment();
        let fromDate, toDate;

        switch (period) {
            case 'today':
                fromDate = today.startOf('day');
                toDate = today.endOf('day');
                break;
            case 'yesterday':
                fromDate = today.subtract(1, 'day').startOf('day');
                toDate = today.endOf('day');
                break;
            case 'this_week':
                // Неделя всегда начинается с понедельника и заканчивается воскресеньем
                fromDate = today.clone().startOf('isoWeek');
                toDate = today.clone().endOf('isoWeek');
                break;
            case 'this_month':
                fromDate = today.clone().startOf('month');
                toDate = today.clone().endOf('month');
                break;
            default:
                // По умолчанию - текущая неделя
                fromDate = today.clone().startOf('isoWeek');
                toDate = today.clone().endOf('isoWeek');
        }

        return {
            fromDate: fromDate.format('YYYY-MM-DD'),
            toDate: toDate.format('YYYY-MM-DD')
        };
    }

    /**
     * Получить человекочитаемое описание периода
     * 
     * @param {string} period - Период ('today', 'yesterday', 'this_week', 'this_month')
     * @returns {string} Описание периода
     */
    static getPeriodDescription(period) {
        const today = moment();
        
        const periodDescriptions = {
            'today': `Сегодня (${today.format('DD.MM.YYYY')})`,
            'yesterday': `Вчера (${today.subtract(1, 'day').format('DD.MM.YYYY')})`,
            'this_week': `Текущая неделя (${today.clone().startOf('isoWeek').format('DD.MM.YYYY')} - ${today.clone().endOf('isoWeek').format('DD.MM.YYYY')})`,
            'this_month': `Текущий месяц (${today.clone().startOf('month').format('DD.MM.YYYY')} - ${today.clone().endOf('month').format('DD.MM.YYYY')})`
        };

        return periodDescriptions[period] || 'Текущая неделя';
    }

    /**
     * Получить локализованное название дня недели
     * 
     * @param {string} date - Дата в формате YYYY-MM-DD
     * @returns {string} Название дня недели
     */
    static getLocalizedDayOfWeek(date) {
        const days = [
            'Воскресенье', 
            'Понедельник', 
            'Вторник', 
            'Среда', 
            'Четверг', 
            'Пятница', 
            'Суббота'
        ];
        return days[moment(date).day()];
    }
}

module.exports = DateUtils;
