app_name = "label_maker"
app_title = "Label Maker"
app_publisher = "Martynas Miliauskas"
app_description = "Create labels for your Items"
app_email = "labels@ekranas.info"
app_license = "mit"

# required_apps = []

# Each item in the list will be shown as an app in the apps page
add_to_apps_screen = [
	{
		"name": "label_maker",
		"logo": "/assets/label_maker/logo.svg",
		"title": "Label Maker",
		"route": "/labels",
	}
]

fixtures = [
	{"dt": "Custom Field", "filters": [["name", "in", ["Item-deposit_package_count"]]]},
	{
		"dt": "Custom DocPerm",
		"filters": [
			["role", "in", ["Label Maker User"]],
			[
				"parent",
				"in",
				["Item"],
			],  # NOTE: consider adding Item Price later, but that will expose buying prices too
		],
	},
]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# Load assets only on the Label Maker page via page-specific boot script
# app_include_js = "/assets/label_maker/js/label_maker_loader.js"  # not needed when using page_js

# include js, css files in header of web template
# web_include_css = "/assets/label_maker/css/label_maker.css"
# web_include_js = "/assets/label_maker/js/label_maker.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "label_maker/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "label_maker/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# automatically load and sync documents of this doctype from downstream apps
# importable_doctypes = [doctype_1]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "label_maker.utils.jinja_methods",
# 	"filters": "label_maker.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "label_maker.install.before_install"
# after_install = "label_maker.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "label_maker.uninstall.before_uninstall"
# after_uninstall = "label_maker.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "label_maker.utils.before_app_install"
# after_app_install = "label_maker.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "label_maker.utils.before_app_uninstall"
# after_app_uninstall = "label_maker.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "label_maker.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"label_maker.tasks.all"
# 	],
# 	"daily": [
# 		"label_maker.tasks.daily"
# 	],
# 	"hourly": [
# 		"label_maker.tasks.hourly"
# 	],
# 	"weekly": [
# 		"label_maker.tasks.weekly"
# 	],
# 	"monthly": [
# 		"label_maker.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "label_maker.install.before_tests"

# Extend DocType Class
# ------------------------------
#
# Specify custom mixins to extend the standard doctype controller.
# extend_doctype_class = {
# 	"Task": "label_maker.custom.task.CustomTaskMixin"
# }

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "label_maker.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "label_maker.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
before_request = ["label_maker.utils.guard.ensure_label_maker_access"]
# after_request = ["label_maker.utils.after_request"]

# Job Events
# ----------
# before_job = ["label_maker.utils.before_job"]
# after_job = ["label_maker.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"label_maker.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }
