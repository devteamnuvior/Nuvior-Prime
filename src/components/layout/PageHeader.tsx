import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <Box sx={{ mb: 6, display: "flex", flexDirection: { xs: "column", sm: "row" }, alignItems: { sm: "flex-start" }, justifyContent: "space-between", gap: 3 }}>
      <Box sx={{ minWidth: 0 }}>
        {eyebrow ? (
          <Typography variant="eyebrow" sx={{ display: "block", mb: 1 }}>
            {eyebrow}
          </Typography>
        ) : null}
        <Typography variant="h1" component="h1">
          {title}
        </Typography>
        {description ? (
          <Typography variant="body1" sx={{ mt: 1, maxWidth: 640, color: "text.secondary" }}>
            {description}
          </Typography>
        ) : null}
      </Box>
      {actions ? <Box sx={{ display: "flex", flexShrink: 0, flexWrap: "wrap", alignItems: "center", gap: 2 }}>{actions}</Box> : null}
    </Box>
  );
}
