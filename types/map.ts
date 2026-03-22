/** `/api/v1/map/latest` — URLs may be relative (e.g. `/static/maps/mock_duct_rect.ply`). */
export interface MapLatestResponse {
  point_cloud_url: string;
  rgb_image_url: string;
}
