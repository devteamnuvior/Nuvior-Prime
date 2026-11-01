import Box from "@mui/material/Box";
import { MapLoading } from "@/components/today/mapChrome";

export default function Loading() {
  return (
    <Box sx={{ flex: 1, minHeight: 0, display: "flex" }}>
      <MapLoading />
    </Box>
  );
}
