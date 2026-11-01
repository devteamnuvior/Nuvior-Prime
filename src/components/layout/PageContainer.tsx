import Container, { type ContainerProps } from "@mui/material/Container";

/** Standard page gutter + max width. Full-bleed surfaces (the map) skip this. */
export function PageContainer({ maxWidth = "lg", sx, ...props }: ContainerProps) {
  return <Container maxWidth={maxWidth} sx={[{ flex: 1, py: { xs: 6, md: 8 }, px: { xs: 4, md: 8 } }, ...(Array.isArray(sx) ? sx : [sx])]} {...props} />;
}
