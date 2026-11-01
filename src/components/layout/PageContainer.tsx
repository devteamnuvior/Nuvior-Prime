import Container, { type ContainerProps } from "@mui/material/Container";

/**
 * Standard page gutter. Fluid by default: the dashboard sits beside a 64px icon rail and
 * pages use the full width, with only the padding keeping content off the edges.
 * Full-bleed surfaces (the map) skip this.
 */
export function PageContainer({ maxWidth = false, sx, ...props }: ContainerProps) {
  return <Container maxWidth={maxWidth} sx={[{ flex: 1, py: { xs: 6, md: 8 }, px: { xs: 4, md: 8 } }, ...(Array.isArray(sx) ? sx : [sx])]} {...props} />;
}
