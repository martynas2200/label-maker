import { createResource } from "frappe-ui"

interface App {
  name: string
  logo: string
  title: string
  route: string
}

export const apps = createResource({
  url: "frappe.apps.get_apps",
  cache: "apps",
  transform: (data: App[]) => {
    let apps: App[] = []
    data.map((app) => {
      if (app.name === "label_maker") return
      apps.push({
        name: app.name,
        logo: app.logo,
        title: app.title,
        route: app.route,
      })
    })
    return apps
  },
})
