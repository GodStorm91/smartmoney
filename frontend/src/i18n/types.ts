import 'react-i18next'

// Extend react-i18next module for type safety
declare module 'react-i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: {
        header: {
          dashboard: string
          upload: string
          transactions: string
          analytics: string
          goals: string
          settings: string
        }
        button: {
          save: string
          cancel: string
          delete: string
          edit: string
          create: string
          update: string
          close: string
          apply: string
          reset: string
          selectFile: string
        }
        language: {
          selectLanguage: string
          japanese: string
          english: string
          vietnamese: string
        }
        aria: {
          mainNavigation: string
          mobileNavigation: string
          openMenu: string
          closeMenu: string
          uploadDropzone: string
        }
        dashboard: {
          title: string
          subtitle: string
          categoryBreakdown: string
          goalAchievability: string
          viewAllCategories: string
          viewDetails: string
          noData: string
          noGoals: string
          yearGoal: string
          quickActions: string
          quickActionUpload: string
          quickActionGoals: string
          quickActionAnalytics: string
        }
        transactions: {
          title: string
          subtitle: string
          startDate: string
          endDate: string
          category: string
          source: string
          all: string
          income: string
          expense: string
          difference: string
          date: string
          description: string
          amount: string
          noData: string
          categoryFood: string
          categoryHousing: string
          sourceRakuten: string
        }
        upload: {
          title: string
          subtitle: string
          history: string
          faq: string
          uploading: string
          pleaseWait: string
          dropOrClick: string
          dropDescription: string
          supportedFormats: string
          requirements: string
          requiredColumns: string
          supportedApps: string
          encoding: string
          noHistory: string
          uploadFirst: string
          success: string
          warning: string
          completed: string
          imported: string
          duplicates: string
          errors: string
          errorDetails: string
          row: string
          count: string
          alertSelectCSV: string
          alertMaxSize: string
          alertUploadFailed: string
          faqQuestion1: string
          faqAnswer1: string
          faqQuestion2: string
          faqAnswer2: string
          faqQuestion3: string
          faqAnswer3: string
        }
        analytics: {
          title: string
          subtitle: string
          currentMonth: string
          '3months': string
          '6months': string
          '1year': string
          incomeVsExpense: string
          categoryBreakdown: string
          monthlyCashFlow: string
          noData: string
          comingSoon: string
        }
        goals: {
          title: string
          subtitle: string
          createGoal: string
          selectPeriod: string
          remainingSlots: string
          maxGoalsReached: string
          yearGoal: string
        }
        common: {
          loading: string
          noData: string
        }
      }
    }
  }
}
