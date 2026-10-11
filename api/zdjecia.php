<?php
/**
 * HappyKids – lista zdjęć z folderu dla galerii i kwiatka.
 * Wywołanie: api/zdjecia.php?folder=galeria  albo  ?folder=kwiatek
 * - galeria: najnowsze na początku (wg daty pliku), kwiatek: wg nazwy (01, 02, 03…)
 * - przy pierwszym wywołaniu tworzy lżejsze kopie zdjęć:
 *     <folder>/_min   – miniatury do siatki (szer. 640 px)
 *     <folder>/_duze  – wersje do powiększenia (dłuższy bok 1800 px)
 *   Kopie odświeżają się same, gdy zmieni się oryginał. Folderów _min i _duze nie trzeba ruszać.
 * Wymaga PHP 7.4+ z rozszerzeniem GD (bez GD działa, ale podaje oryginały).
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-cache');

$FOLDERS = ['galeria' => 'data', 'kwiatek' => 'nazwa'];
$folder = isset($_GET['folder']) ? $_GET['folder'] : '';
if (!isset($FOLDERS[$folder])) { http_response_code(400); echo '[]'; exit; }

$dir = realpath(__DIR__ . '/../' . $folder);
if (!$dir || !is_dir($dir)) { echo '[]'; exit; }
@set_time_limit(180);

$ext = ['jpg', 'jpeg', 'png', 'webp'];
$files = [];
foreach (scandir($dir) as $name) {
  if ($name === '' || $name[0] === '.' || $name[0] === '_') continue;
  $path = $dir . '/' . $name;
  if (!is_file($path)) continue;
  if (!in_array(strtolower(pathinfo($name, PATHINFO_EXTENSION)), $ext, true)) continue;
  $files[] = ['name' => $name, 'time' => filemtime($path)];
}
if ($FOLDERS[$folder] === 'data') {
  usort($files, function ($a, $b) { return $b['time'] <=> $a['time'] ?: strnatcasecmp($b['name'], $a['name']); });
} else {
  usort($files, function ($a, $b) { return strnatcasecmp($a['name'], $b['name']); });
}

$gd = function_exists('imagecreatetruecolor');

function hk_open($path) {
  $e = strtolower(pathinfo($path, PATHINFO_EXTENSION));
  if ($e === 'png') return @imagecreatefrompng($path);
  if ($e === 'webp' && function_exists('imagecreatefromwebp')) return @imagecreatefromwebp($path);
  if ($e === 'jpg' || $e === 'jpeg') {
    $im = @imagecreatefromjpeg($path);
    if ($im && function_exists('exif_read_data')) {           // obrót zdjęć z telefonu
      $exif = @exif_read_data($path);
      $o = isset($exif['Orientation']) ? (int)$exif['Orientation'] : 1;
      if ($o === 3) $im = imagerotate($im, 180, 0);
      elseif ($o === 6) $im = imagerotate($im, -90, 0);
      elseif ($o === 8) $im = imagerotate($im, 90, 0);
    }
    return $im;
  }
  return false;
}

function hk_resized($src, $dst, $maxW, $maxH) {
  if (is_file($dst) && filemtime($dst) >= filemtime($src)) return true;
  $im = hk_open($src);
  if (!$im) return false;
  $w = imagesx($im); $h = imagesy($im);
  $k = min(1, $maxW / $w, $maxH / $h);
  $nw = max(1, (int)round($w * $k)); $nh = max(1, (int)round($h * $k));
  $out = imagecreatetruecolor($nw, $nh);
  $e = strtolower(pathinfo($dst, PATHINFO_EXTENSION));
  if ($e === 'png' || $e === 'webp') { imagealphablending($out, false); imagesavealpha($out, true); }
  imagecopyresampled($out, $im, 0, 0, 0, 0, $nw, $nh, $w, $h);
  if (!is_dir(dirname($dst))) @mkdir(dirname($dst), 0755, true);
  if ($e === 'png') $ok = imagepng($out, $dst, 6);
  elseif ($e === 'webp' && function_exists('imagewebp')) $ok = imagewebp($out, $dst, 82);
  else $ok = imagejpeg($out, $dst, 82);
  imagedestroy($im); imagedestroy($out);
  return $ok;
}

$list = [];
foreach ($files as $f) {
  $n = $f['name'];
  $orig = $folder . '/' . rawurlencode($n);
  $item = ['src' => $orig, 'thumb' => $orig];
  if ($gd) {
    if (hk_resized("$dir/$n", "$dir/_min/$n", 640, 640))   $item['thumb'] = $folder . '/_min/' . rawurlencode($n);
    if (hk_resized("$dir/$n", "$dir/_duze/$n", 1800, 1800)) $item['src']   = $folder . '/_duze/' . rawurlencode($n);
  }
  $list[] = $item;
}
echo json_encode($list, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
