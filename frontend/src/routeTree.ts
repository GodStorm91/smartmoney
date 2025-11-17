import { Route as rootRoute } from './routes/__root'
import { Route as IndexRoute } from './routes/index'
import { Route as UploadRoute } from './routes/upload'
import { Route as TransactionsRoute } from './routes/transactions'
import { Route as AnalyticsRoute } from './routes/analytics'
import { Route as GoalsRoute } from './routes/goals'
import { Route as SettingsRoute } from './routes/settings'

const routeTree = rootRoute.addChildren([
  IndexRoute,
  UploadRoute,
  TransactionsRoute,
  AnalyticsRoute,
  GoalsRoute,
  SettingsRoute,
])

export { routeTree }
