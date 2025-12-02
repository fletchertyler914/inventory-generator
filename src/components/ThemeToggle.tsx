import { Moon, Sun, Monitor } from "lucide-react"
import { Button } from "./ui/button"
import { Tooltip, TooltipTrigger, TooltipContent } from "./ui/tooltip"
import { useTheme } from "@/hooks/useTheme"

export function ThemeToggle() {
  const { theme, resolvedTheme, toggleTheme } = useTheme()

  const getIcon = () => {
    if (theme === "system") {
      return <Monitor className="h-4 w-4" />
    }
    return resolvedTheme === "light" ? (
      <Moon className="h-4 w-4" />
    ) : (
      <Sun className="h-4 w-4" />
    )
  }

  const getTooltip = () => {
    if (theme === "system") {
      return `System (${resolvedTheme}) - Click to set light`
    }
    if (theme === "light") {
      return "Light mode - Click to set dark"
    }
    return "Dark mode - Click to set system"
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9"
          aria-label="Toggle theme"
        >
          {getIcon()}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {getTooltip()}
      </TooltipContent>
    </Tooltip>
  )
}
