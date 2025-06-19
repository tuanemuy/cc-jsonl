vim.lsp.config(
	"tailwindcss-language-server",
	(function()
		local opts = {}
		opts.capabilities = require("blink.cmp").get_lsp_capabilities()
		return opts
	end)()
)

vim.lsp.enable({
	"tailwindcss-language-server",
})
